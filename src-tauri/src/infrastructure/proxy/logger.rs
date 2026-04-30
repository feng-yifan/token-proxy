use std::sync::Arc;
use chrono::Utc;
use uuid::Uuid;
use tokio::sync::broadcast;

use crate::domain::ProxyLog;
use crate::infrastructure::persistence::sqlite_repository::SqliteRepository;

pub async fn log_request(
    db: &Arc<SqliteRepository>,
    sender: Option<&broadcast::Sender<ProxyLog>>,
    access_point_id: &str,
    request_path: &str,
    method: &str,
    status_code: u16,
    latency_ms: u64,
    request_body: Option<&str>,
    response_body: Option<&str>,
    log_full_content: bool,
) {
    let now = Utc::now().to_rfc3339();

    let (req_body, resp_body) = if log_full_content {
        (
            request_body.map(|s| truncate(s, 10000)),
            response_body.map(|s| truncate(s, 10000)),
        )
    } else {
        (None, None)
    };

    let log_entry = ProxyLog {
        id: Uuid::new_v4().to_string(),
        access_point_id: access_point_id.to_string(),
        request_path: request_path.to_string(),
        method: method.to_string(),
        status_code,
        latency_ms,
        request_timestamp: now.clone(),
        request_body: req_body,
        response_body: resp_body,
        created_at: now,
    };

    if let Err(e) = db.insert_log(&log_entry) {
        tracing::error!("记录日志失败: {}", e);
    } else if let Some(sender) = sender {
        let _ = sender.send(log_entry.clone());
    }
}

fn truncate(s: &str, max_len: usize) -> String {
    if s.len() > max_len {
        format!("{}...(已截断)", &s[..max_len])
    } else {
        s.to_string()
    }
}
