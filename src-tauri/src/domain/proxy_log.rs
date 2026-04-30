use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyLog {
    pub id: String,
    pub access_point_id: String,
    pub request_path: String,
    pub method: String,
    pub status_code: u16,
    pub latency_ms: u64,
    pub request_timestamp: String,
    pub original_request_body: Option<String>,
    pub modified_request_body: Option<String>,
    pub response_body: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedLogs {
    pub logs: Vec<ProxyLog>,
    pub total: u64,
    pub page: u32,
    pub page_size: u32,
}
