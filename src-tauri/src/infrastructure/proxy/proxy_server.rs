use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::net::TcpListener;
use axum::{Router, body::Body, http::Request, routing::any};
use tower_http::cors::CorsLayer;

use crate::domain::{ApiService, AccessPoint};
use crate::infrastructure::persistence::sqlite_repository::SqliteRepository;
use super::request_handler;

#[derive(Clone)]
pub struct AppState {
    pub services: Arc<RwLock<Vec<ApiService>>>,
    pub access_points: Arc<RwLock<Vec<AccessPoint>>>,
    pub db: Arc<SqliteRepository>,
}

pub struct ProxyServer {
    state: AppState,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl ProxyServer {
    pub fn new(state: AppState) -> Self {
        Self {
            state,
            shutdown_tx: None,
        }
    }

    pub async fn start(&mut self, port: u16) -> Result<(), String> {
        let (tx, rx) = tokio::sync::oneshot::channel::<()>();
        self.shutdown_tx = Some(tx);

        let state = self.state.clone();
        let addr = format!("127.0.0.1:{}", port);

        let app = Router::new()
            .route("/{*path}", any(move |req: Request<Body>| {
                let state = state.clone();
                async move { request_handler::handle_proxy_request(state, req).await }
            }))
            .layer(CorsLayer::permissive());

        let listener = TcpListener::bind(&addr).await
            .map_err(|e| format!("无法绑定端口 {}: {}", port, e))?;

        tracing::info!("代理服务器启动在 {}", addr);

        tokio::spawn(async move {
            axum::serve(listener, app)
                .with_graceful_shutdown(async move {
                    let _ = rx.await;
                })
                .await
                .ok();
        });

        Ok(())
    }

    pub fn stop(&mut self) {
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
            tracing::info!("代理服务器已停止");
        }
    }
}
