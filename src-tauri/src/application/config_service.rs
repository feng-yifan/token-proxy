use std::sync::Arc;
use tokio::sync::RwLock;

use crate::domain::{ApiService, AccessPoint, AppConfig};
use crate::infrastructure::persistence::yaml_config::YamlConfigRepository;

pub struct ConfigService {
    yaml_repo: Arc<YamlConfigRepository>,
    _services: Arc<RwLock<Vec<ApiService>>>,
    _access_points: Arc<RwLock<Vec<AccessPoint>>>,
}

impl ConfigService {
    pub fn new(
        services: Arc<RwLock<Vec<ApiService>>>,
        access_points: Arc<RwLock<Vec<AccessPoint>>>,
        yaml_repo: Arc<YamlConfigRepository>,
    ) -> Self {
        Self {
            _services: services,
            _access_points: access_points,
            yaml_repo,
        }
    }

    pub fn get_config(&self) -> Result<AppConfig, String> {
        self.yaml_repo.read()
    }

    pub async fn update_proxy_port(&self, port: u16) -> Result<(), String> {
        let mut config = self.yaml_repo.read()?;
        config.proxy_port = port;
        self.yaml_repo.write(&config)?;
        Ok(())
    }

    pub async fn update_log_settings(
        &self,
        max_log_entries: u32,
        retention_days: u32,
    ) -> Result<(), String> {
        let mut config = self.yaml_repo.read()?;
        config.log_settings.max_log_entries = max_log_entries;
        config.log_settings.retention_days = retention_days;
        self.yaml_repo.write(&config)?;
        Ok(())
    }

    pub async fn update_app_theme(&self, theme: String) -> Result<(), String> {
        let mut config = self.yaml_repo.read()?;
        config.app_theme = theme;
        self.yaml_repo.write(&config)?;
        Ok(())
    }

    pub async fn update_start_minimized(&self, minimized: bool) -> Result<(), String> {
        let mut config = self.yaml_repo.read()?;
        config.start_minimized = minimized;
        self.yaml_repo.write(&config)?;
        Ok(())
    }
}
