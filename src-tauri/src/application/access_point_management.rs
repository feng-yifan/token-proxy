use std::sync::Arc;
use tokio::sync::RwLock;

use crate::domain::{AccessPoint, AccessPointService, ApiService};
use crate::infrastructure::persistence::yaml_config::YamlConfigRepository;
use crate::infrastructure::sanitize::sanitize_input;

/// 规范化路径：确保以 / 开头，去除尾部 /
fn normalize_path(path: &str) -> String {
    let trimmed = path.trim();
    // 确保以 / 开头
    let with_slash = if trimmed.starts_with('/') {
        trimmed.to_string()
    } else {
        format!("/{}", trimmed)
    };
    // 去除尾部 / (保留根路径 "/")
    if with_slash != "/" {
        with_slash.trim_end_matches('/').to_string()
    } else {
        with_slash
    }
}

/// 验证服务列表中的所有服务 ID 是否存在
fn validate_services_exist(services: &[AccessPointService], api_services: &[ApiService]) -> Result<(), String> {
    for ap_service in services {
        if !api_services.iter().any(|s| s.id == ap_service.service_id) {
            return Err(format!("关联的服务不存在: {}", ap_service.service_id));
        }
    }
    Ok(())
}

pub struct AccessPointManagement {
    services: Arc<RwLock<Vec<ApiService>>>,
    access_points: Arc<RwLock<Vec<AccessPoint>>>,
    yaml_repo: Arc<YamlConfigRepository>,
}

impl AccessPointManagement {
    pub fn new(
        services: Arc<RwLock<Vec<ApiService>>>,
        access_points: Arc<RwLock<Vec<AccessPoint>>>,
        yaml_repo: Arc<YamlConfigRepository>,
    ) -> Self {
        Self {
            services,
            access_points,
            yaml_repo,
        }
    }

    pub async fn list_access_points(&self) -> Vec<AccessPoint> {
        self.access_points.read().await.clone()
    }

    pub async fn get_access_point(&self, id: &str) -> Result<AccessPoint, String> {
        self.access_points
            .read()
            .await
            .iter()
            .find(|ap| ap.id == id)
            .cloned()
            .ok_or_else(|| "接入点不存在".to_string())
    }

    pub async fn create_access_point(
        &self,
        path: String,
        services: Vec<AccessPointService>,
        api_key: String,
        log_full_content: bool,
    ) -> Result<AccessPoint, String> {
        let path = normalize_path(&sanitize_input(&path));

        // 验证至少有一个服务
        if services.is_empty() {
            return Err("接入点必须至少关联一个服务".to_string());
        }

        // 验证所有服务 ID 存在
        let api_services = self.services.read().await;
        validate_services_exist(&services, &api_services)?;

        // 验证路径不重复
        {
            let access_points = self.access_points.read().await;
            if access_points.iter().any(|ap| ap.path == path) {
                return Err(format!("路径 '{}' 已被其它接入点使用", path));
            }
        }

        let access_point = AccessPoint::new(path, services, sanitize_input(&api_key), log_full_content);
        self.access_points.write().await.push(access_point.clone());
        self.save_to_yaml().await?;
        Ok(access_point)
    }

    pub async fn update_access_point(
        &self,
        id: &str,
        path: String,
        services: Vec<AccessPointService>,
        api_key: String,
        log_full_content: bool,
    ) -> Result<AccessPoint, String> {
        let path = normalize_path(&sanitize_input(&path));

        // 验证至少有一个服务
        if services.is_empty() {
            return Err("接入点必须至少关联一个服务".to_string());
        }

        // 验证所有服务 ID 存在
        let api_services = self.services.read().await;
        validate_services_exist(&services, &api_services)?;

        let mut access_points = self.access_points.write().await;
        let point = access_points
            .iter_mut()
            .find(|ap| ap.id == id)
            .ok_or_else(|| "接入点不存在".to_string())?;

        point.path = path;
        point.services = services;
        point.api_key = sanitize_input(&api_key);
        point.log_full_content = log_full_content;
        point.updated_at = chrono::Utc::now().to_rfc3339();

        let result = point.clone();
        drop(access_points);
        self.save_to_yaml().await?;
        Ok(result)
    }

    pub async fn delete_access_point(&self, id: &str) -> Result<(), String> {
        let mut access_points = self.access_points.write().await;
        let original_len = access_points.len();
        access_points.retain(|ap| ap.id != id);

        if access_points.len() == original_len {
            return Err("接入点不存在".to_string());
        }

        drop(access_points);
        self.save_to_yaml().await?;
        Ok(())
    }

    /// 切换激活的服务（将目标服务移动到列表首位）
    pub async fn switch_service(&self, id: &str, target_service_id: &str) -> Result<AccessPoint, String> {
        // 验证目标服务存在
        {
            let services = self.services.read().await;
            if !services.iter().any(|s| s.id == target_service_id) {
                return Err("目标服务不存在".to_string());
            }
        }

        let mut access_points = self.access_points.write().await;
        let point = access_points
            .iter_mut()
            .find(|ap| ap.id == id)
            .ok_or_else(|| "接入点不存在".to_string())?;

        // 查找目标服务是否已在列表中
        let service_exists = point.services.iter().any(|s| s.service_id == target_service_id);

        if service_exists {
            // 将服务移动到首位
            point.move_service_to_front(target_service_id);
        } else {
            // 添加新服务到首位（使用默认映射）
            point.services.insert(0, AccessPointService {
                service_id: target_service_id.to_string(),
                model_mappings: vec![],
            });
        }

        point.updated_at = chrono::Utc::now().to_rfc3339();

        let result = point.clone();
        drop(access_points);
        self.save_to_yaml().await?;
        Ok(result)
    }

    /// 更新接入点的服务列表
    pub async fn update_services(&self, id: &str, services: Vec<AccessPointService>) -> Result<AccessPoint, String> {
        // 验证至少有一个服务
        if services.is_empty() {
            return Err("接入点必须至少关联一个服务".to_string());
        }

        // 验证所有服务 ID 存在
        let api_services = self.services.read().await;
        validate_services_exist(&services, &api_services)?;

        let mut access_points = self.access_points.write().await;
        let point = access_points
            .iter_mut()
            .find(|ap| ap.id == id)
            .ok_or_else(|| "接入点不存在".to_string())?;

        point.services = services;
        point.updated_at = chrono::Utc::now().to_rfc3339();

        let result = point.clone();
        drop(access_points);
        self.save_to_yaml().await?;
        Ok(result)
    }

    pub async fn toggle_access_point(&self, id: &str) -> Result<AccessPoint, String> {
        let mut access_points = self.access_points.write().await;
        let point = access_points
            .iter_mut()
            .find(|ap| ap.id == id)
            .ok_or_else(|| "接入点不存在".to_string())?;

        point.enabled = !point.enabled;
        point.updated_at = chrono::Utc::now().to_rfc3339();

        let result = point.clone();
        drop(access_points);
        self.save_to_yaml().await?;
        Ok(result)
    }

    async fn save_to_yaml(&self) -> Result<(), String> {
        let mut config = self.yaml_repo.read()?;
        config.services = self.services.read().await.clone();
        config.access_points = self.access_points.read().await.clone();
        self.yaml_repo.write(&config)
    }
}
