use std::time::Instant;
use axum::{
    body::Body,
    http::{StatusCode, Request, Response},
    response::IntoResponse,
};
use reqwest::Client;

use super::proxy_server::AppState;
use super::logger;
use crate::domain::{ApiType, HeaderAction, ModelConfig};

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

    // 查找关联的 API 服务
    let services = state.services.read().await;
    let service = match services.iter().find(|s| s.id == access_point.service_id) {
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

    // 模型名称替换 (仅 Anthropic API 类型)
    let modified_body = if service.api_type == ApiType::Anthropic && !body_bytes.is_empty() {
        replace_model_name(&original_body_str, &service.models)
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

    // 应用自定义 Header 规则
    for rule in &access_point.header_rules {
        match rule.action {
            HeaderAction::Set | HeaderAction::Override => {
                forward_req = forward_req.header(&rule.header_name, &rule.header_value);
            }
            HeaderAction::Remove => {
                // reqwest 不直接支持移除 header，我们通过不添加来实现
            }
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

/// 替换请求体中的 model 字段。
/// 遍历 models 配置，如果 model 值匹配某个别名，则替换为正式名称。
/// 模型不在配置列表中时，透传不变。
fn replace_model_name(body: &str, models: &[ModelConfig]) -> String {
    let mut result = body.to_string();

    for model_config in models {
        for alias in &model_config.aliases {
            // 匹配 "model": "alias_value" 的变体
            let patterns = [
                format!("\"model\": \"{}\"", alias),
                format!("\"model\":\"{}\"", alias),
            ];
            for pattern in &patterns {
                if result.contains(pattern.as_str()) {
                    let replacement = format!("\"model\": \"{}\"", model_config.name);
                    result = result.replace(pattern.as_str(), &replacement);
                }
            }
        }
    }
    result
}
