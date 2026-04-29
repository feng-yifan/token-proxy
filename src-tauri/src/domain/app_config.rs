use serde::{Deserialize, Serialize};

use super::api_service::ApiService;
use super::access_point::AccessPoint;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogSettings {
    pub max_log_entries: u32,
    pub retention_days: u32,
}

impl Default for LogSettings {
    fn default() -> Self {
        Self {
            max_log_entries: 10000,
            retention_days: 30,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub proxy_port: u16,
    pub admin_key: String,
    pub services: Vec<ApiService>,
    pub access_points: Vec<AccessPoint>,
    pub log_settings: LogSettings,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            proxy_port: 9876,
            admin_key: String::new(),
            services: vec![],
            access_points: vec![],
            log_settings: LogSettings::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyStatus {
    pub running: bool,
    pub port: u16,
}
