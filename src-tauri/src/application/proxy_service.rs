use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::Mutex;

use crate::domain::ProxyStatus;
use crate::infrastructure::proxy::proxy_server::{AppState, ProxyServer};

pub struct ProxyService {
    server: Mutex<ProxyServer>,
    port: Mutex<u16>,
    running: AtomicBool,
}

impl ProxyService {
    pub fn new(state: AppState, port: u16) -> Self {
        let server = ProxyServer::new(state);
        Self {
            server: Mutex::new(server),
            port: Mutex::new(port),
            running: AtomicBool::new(false),
        }
    }

    pub async fn start(&self) -> Result<(), String> {
        let port = *self.port.lock().await;
        self.server.lock().await.start(port).await?;
        self.running.store(true, Ordering::SeqCst);
        Ok(())
    }

    pub fn stop(&self) {
        let server = self.server.try_lock();
        if let Ok(mut server) = server {
            server.stop();
        }
        self.running.store(false, Ordering::SeqCst);
    }

    pub async fn restart(&self, port: u16) -> Result<(), String> {
        self.stop();
        *self.port.lock().await = port;
        self.server.lock().await.start(port).await?;
        self.running.store(true, Ordering::SeqCst);
        Ok(())
    }

    pub async fn get_status(&self) -> ProxyStatus {
        ProxyStatus {
            running: self.running.load(Ordering::SeqCst),
            port: *self.port.lock().await,
        }
    }
}
