use std::time::Instant;
use axum::{
    body::Body,
    http::{StatusCode, Request, Response},
    response::IntoResponse,
};
use reqwest::Client;

use super::proxy_server::AppState;
use super::logger;
use crate::domain::{ApiType, ApiService, AccessPointService};

pub async fn handle_proxy_request(
    state: AppState,
    req: Request<Body>,
) -> Response<Body> {
    let path = req.uri().path().to_string();
    let method = req.method().to_string();
    let start = Instant::now();

    // 查找匹配的接入点
    let access_points = state.access_points.read().await;
    let access_point = match access_points.iter().find(|ap| ap.path == path) {
        Some(ap) => ap.clone(),
        None => {
            return (StatusCode::NOT_FOUND, "未找到匹配的接入点").into_response();
        }
    };

    if !access_point.enabled {
        return (StatusCode::SERVICE_UNAVAILABLE, "接入点已禁用").into_response();
    }

    // 获取当前激活的服务（列表第一个）
    let active_service_config = match access_point.active_service() {
        Some(s) => s.clone(),
        None => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "接入点未配置任何服务",
            )
                .into_response();
        }
    };

    // 查找关联的 API 服务
    let services = state.services.read().await;
    let service = match services.iter().find(|s| s.id == active_service_config.service_id) {
        Some(s) => s.clone(),
        None => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "关联的 API 服务不存在",
            )
                .into_response();
        }
    };

    // 构建远程 URL
    let remote_url = format!("{}{}", service.base_url.trim_end_matches('/'), path);

    // 读取请求体
    let (parts, body) = req.into_parts();
    let body_bytes = match axum::body::to_bytes(body, 1024 * 1024 * 10).await {
        Ok(b) => b,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                format!("读取请求体失败: {}", e),
            )
                .into_response();
        }
    };

    // 接入点客户端鉴权
    {
        let client_key = match service.api_type {
            ApiType::Anthropic => {
                parts.headers
                    .get("x-api-key")
                    .and_then(|v| v.to_str().ok())
                    .map(|s| s.to_string())
            }
            ApiType::Openai => {
                parts.headers
                    .get("authorization")
                    .and_then(|v| v.to_str().ok())
                    .and_then(|v| v.strip_prefix("Bearer "))
                    .map(|s| s.trim().to_string())
            }
        };

        let is_valid = client_key.as_ref().map(|k| k == &access_point.api_key).unwrap_or(false);
        if !is_valid {
            return (
                StatusCode::UNAUTHORIZED,
                "无效的 API 密钥",
            )
                .into_response();
        }
    }

    let original_body_str = String::from_utf8_lossy(&body_bytes).to_string();

    // 模型名称映射 (所有 API 类型)
    let modified_body = if !body_bytes.is_empty() {
        apply_model_mapping(&original_body_str, &active_service_config, &service)
    } else {
        original_body_str.clone()
    };

    let modified_body_str = String::from_utf8_lossy(&modified_body.as_bytes()).to_string();

    // 构建转发请求
    let client = Client::new();
    let mut forward_req = client
        .request(
            parts.method.clone(),
            &remote_url,
        );

    // 复制原始 headers（排除 host）
    for (key, value) in parts.headers.iter() {
        if key.as_str().to_lowercase() != "host" {
            forward_req = forward_req.header(key.as_str(), value.as_bytes());
        }
    }

    // 根据 api_type 注入认证头
    match service.api_type {
        ApiType::Anthropic => {
            forward_req = forward_req.header("x-api-key", &service.api_key);
            forward_req = forward_req.header("anthropic-version", "2023-06-01");
        }
        ApiType::Openai => {
            forward_req = forward_req.header("Authorization", format!("Bearer {}", service.api_key));
        }
    }

    if !modified_body.is_empty() {
        forward_req = forward_req.body(modified_body.clone());
    }

    // 发送请求
    let forward_resp = match forward_req.send().await {
        Ok(r) => r,
        Err(e) => {
            let latency = start.elapsed().as_millis() as u64;
            tracing::error!("转发请求失败: {} -> {} : {}", method, remote_url, e);

            // 记录失败日志
            logger::log_request(
                &state.db,
                Some(&state.log_broadcast),
                &access_point.id,
                &path,
                &method,
                502,
                latency,
                None,
                None,
                None,
                access_point.log_full_content,
            )
            .await;

            return (
                StatusCode::BAD_GATEWAY,
                format!("转发请求失败: {}", e),
            )
                .into_response();
        }
    };

    let latency = start.elapsed().as_millis() as u64;
    let status = forward_resp.status().as_u16();

    // 读取响应体
    let resp_headers = forward_resp.headers().clone();
    let resp_body_bytes = match forward_resp.bytes().await {
        Ok(b) => b,
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                format!("读取远程响应失败: {}", e),
            )
                .into_response();
        }
    };

    let response_body_str = String::from_utf8_lossy(&resp_body_bytes).to_string();

    // 记录日志
    logger::log_request(
        &state.db,
        Some(&state.log_broadcast),
        &access_point.id,
        &path,
        &method,
        status,
        latency,
        Some(&original_body_str),
        Some(&modified_body_str),
        Some(&response_body_str),
        access_point.log_full_content,
    )
    .await;

    // 构建响应
    let mut response = Response::builder().status(status);
    for (key, value) in resp_headers.iter() {
        response = response.header(key.as_str(), value.as_bytes());
    }

    response
        .body(Body::from(resp_body_bytes))
        .unwrap_or_else(|_| {
            Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from("构建响应失败"))
                .unwrap()
        })
}

/// 从 JSON 请求体中提取 model 字段值。
fn extract_model_name(body: &str) -> Option<String> {
    let json: serde_json::Value = serde_json::from_str(body).ok()?;
    json.get("model")?.as_str().map(|s| s.to_string())
}

/// 替换 body 中的 model 值：from → to。
fn replace_model_in_body(body: &str, from: &str, to: &str) -> String {
    let patterns = [
        format!("\"model\": \"{}\"", from),
        format!("\"model\":\"{}\"", from),
    ];
    let replacement = format!("\"model\": \"{}\"", to);
    let mut result = body.to_string();
    for pattern in &patterns {
        result = result.replace(pattern.as_str(), &replacement);
    }
    result
}

/// 特殊值：匹配所有未映射的模型
const OTHER_MODELS: &str = "__other__";
/// 特殊值：使用默认模型
const DEFAULT_MODEL: &str = "__default__";

/// 模型映射核心逻辑：
/// 1. 从请求体提取 model 字段值
/// 2. 检查接入点服务配置中的 model_mappings (精确 source → target)
///    - source 为 "__other__" 时表示匹配所有未明确映射的模型
///    - target 为 "__default__" 时表示使用关联服务的 default_model
/// 3. 若模型已在 service.models 中 → 透传 (客户端直接发了上游模型名)
/// 4. 否则用 service.default_model 替换 (最终回退)
fn apply_model_mapping(
    body: &str,
    ap_service: &AccessPointService,
    service: &ApiService,
) -> String {
    let model_name = match extract_model_name(body) {
        Some(m) => m,
        None => return body.to_string(),
    };

    // 步骤 1: 检查接入点服务配置的映射表
    for mapping in &ap_service.model_mappings {
        let source_matches = mapping.source == OTHER_MODELS || mapping.source == model_name;
        if source_matches {
            let target = if mapping.target == DEFAULT_MODEL {
                &service.default_model
            } else {
                &mapping.target
            };
            if !target.is_empty() && target != &model_name {
                return replace_model_in_body(body, &model_name, target);
            }
        }
    }

    // 步骤 2: 检查模型是否已在服务模型列表中 (透传)
    if service.models.iter().any(|m| m.name == model_name) {
        return body.to_string();
    }

    // 步骤 3: 使用默认模型回退
    if !service.default_model.is_empty() && service.default_model != model_name {
        return replace_model_in_body(body, &model_name, &service.default_model);
    }

    body.to_string()
}
