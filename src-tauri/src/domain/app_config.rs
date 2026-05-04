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
    #[serde(default = "default_app_theme")]
    pub app_theme: String,
    #[serde(default)]
    pub start_minimized: bool,
    pub services: Vec<ApiService>,
    pub access_points: Vec<AccessPoint>,
    pub log_settings: LogSettings,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            proxy_port: 9876,
            app_theme: String::from("system"),
            start_minimized: false,
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

fn default_app_theme() -> String {
    "system".to_string()
}
