use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelMapping {
    pub source: String,
    pub target: String,
}

/// 接入点关联的服务配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessPointService {
    pub service_id: String,
    #[serde(default)]
    pub model_mappings: Vec<ModelMapping>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessPoint {
    pub id: String,
    pub path: String,
    pub services: Vec<AccessPointService>,
    #[serde(default)]
    pub api_key: String,
    pub log_full_content: bool,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl AccessPoint {
    pub fn new(
        path: String,
        services: Vec<AccessPointService>,
        api_key: String,
        log_full_content: bool,
    ) -> Self {
        let now = Utc::now().to_rfc3339();
        Self {
            id: Uuid::new_v4().to_string(),
            path,
            services,
            api_key,
            log_full_content,
            enabled: true,
            created_at: now.clone(),
            updated_at: now,
        }
    }

    /// 获取当前激活的服务（列表第一个）
    #[allow(dead_code)]
    pub fn active_service(&self) -> Option<&AccessPointService> {
        self.services.first()
    }

    /// 根据服务 ID 查找服务配置
    #[allow(dead_code)]
    pub fn find_service(&self, service_id: &str) -> Option<&AccessPointService> {
        self.services.iter().find(|s| s.service_id == service_id)
    }

    /// 根据服务 ID 查找可变服务配置
    #[allow(dead_code)]
    pub fn find_service_mut(&mut self, service_id: &str) -> Option<&mut AccessPointService> {
        self.services.iter_mut().find(|s| s.service_id == service_id)
    }

    /// 将服务移动到列表首位
    pub fn move_service_to_front(&mut self, service_id: &str) {
        if let Some(pos) = self.services.iter().position(|s| s.service_id == service_id) {
            let service = self.services.remove(pos);
            self.services.insert(0, service);
        }
    }
}
