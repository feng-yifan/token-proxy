use std::sync::Arc;
use tauri::State;

use crate::application::service_management::ServiceManagement;
use crate::application::access_point_management::AccessPointManagement;
use crate::application::proxy_service::ProxyService;
use crate::application::log_service::LogService;
use crate::application::config_service::ConfigService;
use crate::domain::*;

/// 前端通过 Tauri State 访问所有应用服务的托管状态
pub struct AppStateManaged {
    pub service_mgmt: Arc<ServiceManagement>,
    pub access_point_mgmt: Arc<AccessPointManagement>,
    pub proxy_service: Arc<ProxyService>,
    pub log_service: Arc<LogService>,
    pub config_service: Arc<ConfigService>,
}

// ==================== Service 管理 ====================

#[tauri::command]
pub async fn list_services(state: State<'_, AppStateManaged>) -> Result<Vec<ApiService>, String> {
    Ok(state.service_mgmt.list_services().await)
}

#[tauri::command]
pub async fn get_service(state: State<'_, AppStateManaged>, id: String) -> Result<ApiService, String> {
    state.service_mgmt.get_service(&id).await
}

#[tauri::command]
pub async fn create_service(
    state: State<'_, AppStateManaged>,
    name: String,
    base_url: String,
    api_key: String,
    api_type: String,
    models: Vec<ModelConfig>,
    default_model: String,
) -> Result<ApiService, String> {
    let api_type: ApiType = serde_json::from_str(&format!("\"{}\"", api_type))
        .map_err(|e| format!("无效的 API 类型: {}", e))?;
    state.service_mgmt.create_service(name, base_url, api_key, api_type, models, default_model).await
}

#[tauri::command]
pub async fn update_service(
    state: State<'_, AppStateManaged>,
    id: String,
    name: String,
    base_url: String,
    api_key: String,
    api_type: String,
    models: Vec<ModelConfig>,
    default_model: String,
) -> Result<ApiService, String> {
    let api_type: ApiType = serde_json::from_str(&format!("\"{}\"", api_type))
        .map_err(|e| format!("无效的 API 类型: {}", e))?;
    state.service_mgmt.update_service(&id, name, base_url, api_key, api_type, models, default_model).await
}

#[tauri::command]
pub async fn delete_service(state: State<'_, AppStateManaged>, id: String) -> Result<(), String> {
    state.service_mgmt.delete_service(&id).await
}

// ==================== Access Point 管理 ====================

#[tauri::command]
pub async fn list_access_points(state: State<'_, AppStateManaged>) -> Result<Vec<AccessPoint>, String> {
    Ok(state.access_point_mgmt.list_access_points().await)
}

#[tauri::command]
pub async fn get_access_point(state: State<'_, AppStateManaged>, id: String) -> Result<AccessPoint, String> {
    state.access_point_mgmt.get_access_point(&id).await
}

#[tauri::command]
pub async fn create_access_point(
    state: State<'_, AppStateManaged>,
    path: String,
    services: Vec<AccessPointService>,
    api_key: String,
    log_full_content: bool,
) -> Result<AccessPoint, String> {
    state.access_point_mgmt.create_access_point(path, services, api_key, log_full_content).await
}

#[tauri::command]
pub async fn update_access_point(
    state: State<'_, AppStateManaged>,
    id: String,
    path: String,
    services: Vec<AccessPointService>,
    api_key: String,
    log_full_content: bool,
) -> Result<AccessPoint, String> {
    state.access_point_mgmt.update_access_point(&id, path, services, api_key, log_full_content).await
}

#[tauri::command]
pub async fn delete_access_point(state: State<'_, AppStateManaged>, id: String) -> Result<(), String> {
    state.access_point_mgmt.delete_access_point(&id).await
}

#[tauri::command]
pub async fn switch_access_point_service(
    state: State<'_, AppStateManaged>,
    id: String,
    service_id: String,
) -> Result<AccessPoint, String> {
    state.access_point_mgmt.switch_service(&id, &service_id).await
}

#[tauri::command]
pub async fn update_access_point_services(
    state: State<'_, AppStateManaged>,
    id: String,
    services: Vec<AccessPointService>,
) -> Result<AccessPoint, String> {
    state.access_point_mgmt.update_services(&id, services).await
}

#[tauri::command]
pub async fn toggle_access_point(state: State<'_, AppStateManaged>, id: String) -> Result<AccessPoint, String> {
    state.access_point_mgmt.toggle_access_point(&id).await
}

// ==================== Log 管理 ====================

#[tauri::command]
pub fn query_logs(
    state: State<'_, AppStateManaged>,
    page: u32,
    page_size: u32,
    access_point_id: Option<String>,
) -> Result<PaginatedLogs, String> {
    state.log_service.query_logs(page, page_size, access_point_id)
}

#[tauri::command]
pub fn get_log(state: State<'_, AppStateManaged>, id: String) -> Result<ProxyLog, String> {
    state.log_service.get_log(&id)
}

#[tauri::command]
pub fn clear_logs(state: State<'_, AppStateManaged>) -> Result<u64, String> {
    state.log_service.clear_logs()
}

// ==================== Config 管理 ====================

#[tauri::command]
pub fn get_config(state: State<'_, AppStateManaged>) -> Result<AppConfig, String> {
    state.config_service.get_config()
}

#[tauri::command]
pub async fn update_proxy_port(state: State<'_, AppStateManaged>, port: u16) -> Result<(), String> {
    state.config_service.update_proxy_port(port).await?;
    let _ = state.proxy_service.restart(port).await;
    Ok(())
}

#[tauri::command]
pub async fn update_log_settings(
    state: State<'_, AppStateManaged>,
    max_log_entries: u32,
    retention_days: u32,
) -> Result<(), String> {
    state.config_service.update_log_settings(max_log_entries, retention_days).await
}

#[tauri::command]
pub async fn update_app_theme(state: State<'_, AppStateManaged>, theme: String) -> Result<(), String> {
    state.config_service.update_app_theme(theme).await
}

#[tauri::command]
pub async fn update_start_minimized(state: State<'_, AppStateManaged>, minimized: bool) -> Result<(), String> {
    state.config_service.update_start_minimized(minimized).await
}

// ==================== Proxy 控制 ====================

#[tauri::command]
pub async fn get_proxy_status(state: State<'_, AppStateManaged>) -> Result<ProxyStatus, String> {
    Ok(state.proxy_service.get_status().await)
}

#[tauri::command]
pub async fn restart_proxy(state: State<'_, AppStateManaged>) -> Result<(), String> {
    let status = state.proxy_service.get_status().await;
    state.proxy_service.restart(status.port).await
}
