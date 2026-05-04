use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum HeaderAction {
    Set,
    Override,
    Remove,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeaderRule {
    pub header_name: String,
    pub header_value: String,
    pub action: HeaderAction,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessPoint {
    pub id: String,
    pub path: String,
    pub service_id: String,
    pub header_rules: Vec<HeaderRule>,
    pub api_key: String,
    pub log_full_content: bool,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl AccessPoint {
    pub fn new(
        path: String,
        service_id: String,
        header_rules: Vec<HeaderRule>,
        api_key: String,
        log_full_content: bool,
    ) -> Self {
        let now = Utc::now().to_rfc3339();
        Self {
            id: Uuid::new_v4().to_string(),
            path,
            service_id,
            header_rules,
            api_key,
            log_full_content,
            enabled: true,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}
