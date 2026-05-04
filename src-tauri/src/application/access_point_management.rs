use std::sync::Arc;
use tokio::sync::RwLock;

use crate::domain::{AccessPoint, ApiService, HeaderRule};
use crate::infrastructure::persistence::yaml_config::YamlConfigRepository;

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
        service_id: String,
        header_rules: Vec<HeaderRule>,
        api_key: String,
        log_full_content: bool,
    ) -> Result<AccessPoint, String> {
        let path = normalize_path(&path);

        // 验证 service_id 存在
        {
            let services = self.services.read().await;
            if !services.iter().any(|s| s.id == service_id) {
                return Err("关联的服务不存在".to_string());
            }
        }

        // 验证路径不重复
        {
            let access_points = self.access_points.read().await;
            if access_points.iter().any(|ap| ap.path == path) {
                return Err(format!("路径 '{}' 已被其它接入点使用", path));
            }
        }

        let access_point = AccessPoint::new(path, service_id, header_rules, api_key, log_full_content);
        self.access_points.write().await.push(access_point.clone());
        self.save_to_yaml().await?;
        Ok(access_point)
    }

    pub async fn update_access_point(
        &self,
        id: &str,
        path: String,
        service_id: String,
        header_rules: Vec<HeaderRule>,
        api_key: String,
        log_full_content: bool,
    ) -> Result<AccessPoint, String> {
        let path = normalize_path(&path);

        // 验证 service_id 存在
        {
            let services = self.services.read().await;
            if !services.iter().any(|s| s.id == service_id) {
                return Err("关联的服务不存在".to_string());
            }
        }

        let mut access_points = self.access_points.write().await;
        let point = access_points
            .iter_mut()
            .find(|ap| ap.id == id)
            .ok_or_else(|| "接入点不存在".to_string())?;

        point.path = path;
        point.service_id = service_id;
        point.header_rules = header_rules;
        point.api_key = api_key;
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

    pub async fn update_service_id(&self, id: &str, service_id: &str) -> Result<AccessPoint, String> {
        // 验证 service_id 存在
        {
            let services = self.services.read().await;
            if !services.iter().any(|s| s.id == service_id) {
                return Err("关联的服务不存在".to_string());
            }
        }

        let mut access_points = self.access_points.write().await;
        let point = access_points
            .iter_mut()
            .find(|ap| ap.id == id)
            .ok_or_else(|| "接入点不存在".to_string())?;

        point.service_id = service_id.to_string();
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
