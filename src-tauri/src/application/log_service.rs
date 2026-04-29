use std::sync::Arc;

use crate::domain::{ProxyLog, PaginatedLogs};
use crate::infrastructure::persistence::sqlite_repository::SqliteRepository;

pub struct LogService {
    db: Arc<SqliteRepository>,
}

impl LogService {
    pub fn new(db: Arc<SqliteRepository>) -> Self {
        Self { db }
    }

    pub fn query_logs(
        &self,
        page: u32,
        page_size: u32,
        access_point_id: Option<String>,
    ) -> Result<PaginatedLogs, String> {
        self.db.query_logs(page, page_size, access_point_id)
    }

    pub fn get_log(&self, id: &str) -> Result<ProxyLog, String> {
        self.db.get_log(id)
    }

    pub fn clear_logs(&self) -> Result<u64, String> {
        self.db.clear_logs()
    }

    pub fn cleanup_old_logs(&self, retention_days: u32) -> Result<u64, String> {
        self.db.cleanup_old_logs(retention_days)
    }
}
