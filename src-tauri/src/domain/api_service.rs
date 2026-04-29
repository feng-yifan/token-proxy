use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiService {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub api_key: String,
    pub created_at: String,
    pub updated_at: String,
}

impl ApiService {
    pub fn new(name: String, base_url: String, api_key: String) -> Self {
        let now = Utc::now().to_rfc3339();
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            base_url,
            api_key,
            created_at: now.clone(),
            updated_at: now,
        }
    }
}
