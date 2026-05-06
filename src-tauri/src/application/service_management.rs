use std::sync::Arc;
use tokio::sync::RwLock;

use crate::domain::{ApiService, ApiType, ModelConfig};
use crate::infrastructure::persistence::yaml_config::YamlConfigRepository;
use crate::infrastructure::sanitize::sanitize_input;

pub struct ServiceManagement {
    services: Arc<RwLock<Vec<ApiService>>>,
    access_points: Arc<RwLock<Vec<crate::domain::AccessPoint>>>,
    yaml_repo: Arc<YamlConfigRepository>,
}

impl ServiceManagement {
    pub fn new(
        services: Arc<RwLock<Vec<ApiService>>>,
        access_points: Arc<RwLock<Vec<crate::domain::AccessPoint>>>,
        yaml_repo: Arc<YamlConfigRepository>,
    ) -> Self {
        Self {
            services,
            access_points,
            yaml_repo,
        }
    }

    pub async fn list_services(&self) -> Vec<ApiService> {
        self.services.read().await.clone()
    }

    pub async fn get_service(&self, id: &str) -> Result<ApiService, String> {
        self.services
            .read()
            .await
            .iter()
            .find(|s| s.id == id)
            .cloned()
            .ok_or_else(|| "服务不存在".to_string())
    }

    pub async fn create_service(
        &self,
        name: String,
        base_url: String,
        api_key: String,
        api_type: ApiType,
        models: Vec<ModelConfig>,
        default_model: String,
    ) -> Result<ApiService, String> {
        let name = sanitize_input(&name);
        let base_url = sanitize_input(&base_url);
        let api_key = sanitize_input(&api_key);

        let default_model = if default_model.is_empty() {
            // 若未指定默认模型且模型列表非空，使用第一个模型
            models.first().map(|m| m.name.clone()).unwrap_or_default()
        } else {
            sanitize_input(&default_model)
        };

        let service = ApiService::new(name, base_url, api_key, api_type, models, default_model);
        self.services.write().await.push(service.clone());
        self.save_to_yaml().await?;
        Ok(service)
    }

    pub async fn update_service(
        &self,
        id: &str,
        name: String,
        base_url: String,
        api_key: String,
        api_type: ApiType,
        models: Vec<ModelConfig>,
        default_model: String,
    ) -> Result<ApiService, String> {
        let name = sanitize_input(&name);
        let base_url = sanitize_input(&base_url);
        let api_key = sanitize_input(&api_key);

        let mut services = self.services.write().await;
        let service = services
            .iter_mut()
            .find(|s| s.id == id)
            .ok_or_else(|| "服务不存在".to_string())?;

        let default_model = if default_model.is_empty() {
            models.first().map(|m| m.name.clone()).unwrap_or_default()
        } else {
            sanitize_input(&default_model)
        };

        service.name = name;
        service.base_url = base_url;
        service.api_key = api_key;
        service.api_type = api_type;
        service.models = models;
        service.default_model = default_model;
        service.updated_at = chrono::Utc::now().to_rfc3339();

        let result = service.clone();
        drop(services);
        self.save_to_yaml().await?;
        Ok(result)
    }

    pub async fn delete_service(&self, id: &str) -> Result<(), String> {
        let mut services = self.services.write().await;
        let original_len = services.len();
        services.retain(|s| s.id != id);

        if services.len() == original_len {
            return Err("服务不存在".to_string());
        }

        // 同时删除关联此服务的接入点配置
        let mut access_points = self.access_points.write().await;
        for ap in access_points.iter_mut() {
            ap.services.retain(|s| s.service_id != id);
        }
        // 移除没有任何服务配置的接入点
        access_points.retain(|ap| !ap.services.is_empty());

        drop(services);
        drop(access_points);
        self.save_to_yaml().await?;
        Ok(())
    }

    async fn save_to_yaml(&self) -> Result<(), String> {
        let mut config = self.yaml_repo.read()?;
        config.services = self.services.read().await.clone();
        config.access_points = self.access_points.read().await.clone();
        self.yaml_repo.write(&config)
    }
}
