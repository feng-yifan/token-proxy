use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ApiType {
    #[serde(rename = "anthropic")]
    Anthropic,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub name: String,
    pub aliases: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiService {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    pub api_type: ApiType,
    pub models: Vec<ModelConfig>,
    pub created_at: String,
    pub updated_at: String,
}

impl ApiService {
    pub fn new(
        name: String,
        base_url: String,
        api_key: String,
        api_type: ApiType,
        models: Vec<ModelConfig>,
    ) -> Self {
        let now = Utc::now().to_rfc3339();
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            base_url,
            api_key,
            api_type,
            models,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}
