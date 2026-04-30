use std::path::PathBuf;
use std::sync::Mutex;
use rusqlite::{Connection, params};
use crate::domain::{ProxyLog, PaginatedLogs};

pub struct SqliteRepository {
    conn: Mutex<Connection>,
}

impl SqliteRepository {
    pub fn new(db_path: PathBuf) -> Result<Self, String> {
        let conn = Connection::open(&db_path)
            .map_err(|e| format!("无法打开数据库: {}", e))?;

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS proxy_logs (
                id TEXT PRIMARY KEY,
                access_point_id TEXT NOT NULL,
                request_path TEXT NOT NULL,
                method TEXT NOT NULL,
                status_code INTEGER NOT NULL,
                latency_ms INTEGER NOT NULL,
                request_timestamp TEXT NOT NULL,
                original_request_body TEXT,
                modified_request_body TEXT,
                response_body TEXT,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON proxy_logs(request_timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_logs_access_point ON proxy_logs(access_point_id);"
        ).map_err(|e| format!("无法初始化数据库: {}", e))?;

        Ok(Self { conn: Mutex::new(conn) })
    }

    pub fn insert_log(&self, log: &ProxyLog) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
        conn.execute(
            "INSERT INTO proxy_logs (id, access_point_id, request_path, method, status_code, latency_ms, request_timestamp, original_request_body, modified_request_body, response_body, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![
                log.id,
                log.access_point_id,
                log.request_path,
                log.method,
                log.status_code,
                log.latency_ms,
                log.request_timestamp,
                log.original_request_body,
                log.modified_request_body,
                log.response_body,
                log.created_at,
            ],
        ).map_err(|e| format!("写入日志失败: {}", e))?;
        Ok(())
    }

    pub fn query_logs(
        &self,
        page: u32,
        page_size: u32,
        access_point_id: Option<String>,
    ) -> Result<PaginatedLogs, String> {
        let conn = self.conn.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
        let offset = (page.saturating_sub(1)) * page_size;

        let total: u64 = if let Some(ref ap_id) = access_point_id {
            conn.query_row(
                "SELECT COUNT(*) FROM proxy_logs WHERE access_point_id = ?1",
                params![ap_id],
                |row| row.get(0),
            ).map_err(|e| format!("查询日志总数失败: {}", e))?
        } else {
            conn.query_row("SELECT COUNT(*) FROM proxy_logs", [], |row| row.get(0))
                .map_err(|e| format!("查询日志总数失败: {}", e))?
        };

        let logs = if let Some(ref ap_id) = access_point_id {
            let mut stmt = conn.prepare(
                "SELECT id, access_point_id, request_path, method, status_code, latency_ms, request_timestamp, original_request_body, modified_request_body, response_body, created_at
                 FROM proxy_logs WHERE access_point_id = ?1
                 ORDER BY request_timestamp DESC LIMIT ?2 OFFSET ?3"
            ).map_err(|e| format!("准备查询失败: {}", e))?;
            let rows = stmt.query_map(params![ap_id, page_size, offset], row_to_proxy_log)
                .map_err(|e| format!("查询日志失败: {}", e))?;
            collect_rows(rows)?
        } else {
            let mut stmt = conn.prepare(
                "SELECT id, access_point_id, request_path, method, status_code, latency_ms, request_timestamp, original_request_body, modified_request_body, response_body, created_at
                 FROM proxy_logs ORDER BY request_timestamp DESC LIMIT ?1 OFFSET ?2"
            ).map_err(|e| format!("准备查询失败: {}", e))?;
            let rows = stmt.query_map(params![page_size, offset], row_to_proxy_log)
                .map_err(|e| format!("查询日志失败: {}", e))?;
            collect_rows(rows)?
        };

        Ok(PaginatedLogs { logs, total, page, page_size })
    }

    pub fn get_log(&self, id: &str) -> Result<ProxyLog, String> {
        let conn = self.conn.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
        conn.query_row(
            "SELECT id, access_point_id, request_path, method, status_code, latency_ms, request_timestamp, original_request_body, modified_request_body, response_body, created_at
             FROM proxy_logs WHERE id = ?1",
            params![id],
            row_to_proxy_log,
        ).map_err(|e| format!("查询日志失败: {}", e))
    }

    pub fn clear_logs(&self) -> Result<u64, String> {
        let conn = self.conn.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
        conn.execute("DELETE FROM proxy_logs", [])
            .map(|count| count as u64)
            .map_err(|e| format!("清空日志失败: {}", e))
    }

    pub fn cleanup_old_logs(&self, retention_days: u32) -> Result<u64, String> {
        let conn = self.conn.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
        let cutoff = chrono::Utc::now() - chrono::Duration::days(retention_days as i64);
        let cutoff_str = cutoff.to_rfc3339();

        conn.execute(
            "DELETE FROM proxy_logs WHERE created_at < ?1",
            params![cutoff_str],
        ).map(|count| count as u64)
        .map_err(|e| format!("清理日志失败: {}", e))
    }
}

fn row_to_proxy_log(row: &rusqlite::Row) -> rusqlite::Result<ProxyLog> {
    Ok(ProxyLog {
        id: row.get(0)?,
        access_point_id: row.get(1)?,
        request_path: row.get(2)?,
        method: row.get(3)?,
        status_code: row.get(4)?,
        latency_ms: row.get(5)?,
        request_timestamp: row.get(6)?,
        original_request_body: row.get(7)?,
        modified_request_body: row.get(8)?,
        response_body: row.get(9)?,
        created_at: row.get(10)?,
    })
}

fn collect_rows(rows: impl Iterator<Item = rusqlite::Result<ProxyLog>>) -> Result<Vec<ProxyLog>, String> {
    let mut logs = Vec::new();
    for row in rows {
        logs.push(row.map_err(|e| format!("读取日志行失败: {}", e))?);
    }
    Ok(logs)
}
