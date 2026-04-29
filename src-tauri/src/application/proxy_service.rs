use tokio::sync::Mutex;

use crate::domain::ProxyStatus;
use crate::infrastructure::proxy::proxy_server::{AppState, ProxyServer};

pub struct ProxyService {
    server: Mutex<ProxyServer>,
    port: Mutex<u16>,
}

impl ProxyService {
    pub fn new(state: AppState, port: u16) -> Self {
        let server = ProxyServer::new(state);
        Self {
            server: Mutex::new(server),
            port: Mutex::new(port),
        }
    }

    pub async fn start(&self) -> Result<(), String> {
        let port = *self.port.lock().await;
        self.server.lock().await.start(port).await
    }

    pub fn stop(&self) {
        // Need to get the server lock via spawn_blocking since stop is sync
        let server = self.server.try_lock();
        if let Ok(mut server) = server {
            server.stop();
        }
    }

    pub async fn restart(&self, port: u16) -> Result<(), String> {
        self.stop();
        *self.port.lock().await = port;
        self.server.lock().await.start(port).await
    }

    pub async fn get_status(&self) -> ProxyStatus {
        ProxyStatus {
            running: true,
            port: *self.port.lock().await,
        }
    }
}
