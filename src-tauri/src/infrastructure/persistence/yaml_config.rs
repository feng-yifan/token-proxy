use std::fs;
use std::path::PathBuf;

use crate::domain::AppConfig;

pub struct YamlConfigRepository {
    config_path: PathBuf,
}

impl YamlConfigRepository {
    pub fn new(config_path: PathBuf) -> Self {
        Self { config_path }
    }

    pub fn read(&self) -> Result<AppConfig, String> {
        if !self.config_path.exists() {
            let default_config = AppConfig::default();
            self.write(&default_config)?;
            return Ok(default_config);
        }

        let content = fs::read_to_string(&self.config_path)
            .map_err(|e| format!("无法读取配置文件: {}", e))?;

        serde_yaml::from_str(&content)
            .map_err(|e| format!("无法解析配置文件: {}", e))
    }

    pub fn write(&self, config: &AppConfig) -> Result<(), String> {
        let content = serde_yaml::to_string(config)
            .map_err(|e| format!("无法序列化配置: {}", e))?;

        fs::write(&self.config_path, content)
            .map_err(|e| format!("无法写入配置文件: {}", e))
    }
}
