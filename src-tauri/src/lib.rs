mod domain;
mod infrastructure;
mod application;
mod interface;

use std::sync::Arc;
use std::path::PathBuf;
use tokio::sync::RwLock;
use notify::Watcher;
use tauri::Manager;
use tauri::Emitter;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::WindowEvent;

use domain::*;
use infrastructure::persistence::yaml_config::YamlConfigRepository;
use infrastructure::persistence::sqlite_repository::SqliteRepository;
use infrastructure::proxy::proxy_server::AppState;
use application::service_management::ServiceManagement;
use application::access_point_management::AccessPointManagement;
use application::proxy_service::ProxyService;
use application::log_service::LogService;
use application::config_service::ConfigService;
use interface::commands::AppStateManaged;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .setup(|app| {
            // ===== 托盘图标初始化 =====
            let show_item = MenuItemBuilder::with_id("show", "显示窗口")
                .build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "退出")
                .build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&show_item)
                .separator()
                .item(&quit_item)
                .build()?;

            let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))
                .expect("无法加载托盘图标");

            TrayIconBuilder::new()
                .icon(icon)
                .menu(&menu)
                .tooltip("Token Proxy")
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.unminimize();
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            if let Some(state) = app.try_state::<AppStateManaged>() {
                                state.proxy_service.stop();
                            }
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            let app_handle = app.handle().clone();

            // ===== 日志实时推送通道 =====
            let (log_tx, log_rx) = tokio::sync::broadcast::channel::<domain::proxy_log::ProxyLog>(256);

            // 事件转发任务：broadcast receiver → Tauri event
            let app_handle_clone = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                let mut rx = log_rx;
                while let Ok(log) = rx.recv().await {
                    let _ = app_handle_clone.emit("proxy-log-new", &log);
                }
            });

            let log_tx_for_state = log_tx.clone();

            // ===== 同步初始化（必须在 spawn 之前完成，否则 Tauri 命令无法找到托管状态）=====

            // 1. 解析配置目录
            let config_path = resolve_config_path();

            // 2. 初始化 YAML 配置仓库
            let yaml_repo = Arc::new(YamlConfigRepository::new(config_path.clone()));

            // 3. 读取初始配置
            let config = yaml_repo.read().unwrap_or_default();
            let proxy_port = config.proxy_port;
            let retention_days = config.log_settings.retention_days;

            // 4. 创建共享内存状态
            let services: Arc<RwLock<Vec<ApiService>>> =
                Arc::new(RwLock::new(config.services.clone()));
            let access_points: Arc<RwLock<Vec<AccessPoint>>> =
                Arc::new(RwLock::new(config.access_points.clone()));

            // 5. 初始化 SQLite
            let db_path = std::env::current_dir()
                .unwrap_or_else(|_| PathBuf::from("."))
                .join("token-proxy.db");
            let db = Arc::new(
                SqliteRepository::new(db_path)
                    .expect("无法初始化数据库"),
            );

            // 6. 创建配置变更通知通道
            let (config_tx, _config_rx) =
                tokio::sync::watch::channel(proxy_port);

            // 7. 创建应用层服务
            let service_mgmt = Arc::new(ServiceManagement::new(
                services.clone(),
                access_points.clone(),
                yaml_repo.clone(),
            ));

            let access_point_mgmt = Arc::new(AccessPointManagement::new(
                services.clone(),
                access_points.clone(),
                yaml_repo.clone(),
            ));

            let app_state = AppState {
                services: services.clone(),
                access_points: access_points.clone(),
                db: db.clone(),
                log_broadcast: log_tx_for_state,
            };

            let proxy_service = Arc::new(ProxyService::new(
                app_state,
                proxy_port,
            ));

            let log_service = Arc::new(LogService::new(db.clone()));

            let config_service = Arc::new(ConfigService::new(
                services.clone(),
                access_points.clone(),
                yaml_repo.clone(),
            ));

            // 8. 注册托管状态 —— 必须在 spawn 之前，否则前端调用命令时会报
            //    "state not managed for field `state` on command ..."
            let managed = AppStateManaged {
                service_mgmt: service_mgmt.clone(),
                access_point_mgmt: access_point_mgmt.clone(),
                proxy_service: proxy_service.clone(),
                log_service: log_service.clone(),
                config_service: config_service.clone(),
            };
            app_handle.manage(managed);
            tracing::info!("Token Proxy 状态已托管, 代理端口: {}", proxy_port);

            // ===== 静默启动 =====
            if config.start_minimized {
                let app_handle_hide = app_handle.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    if let Some(window) = app_handle_hide.get_webview_window("main") {
                        let _ = window.hide();
                    }
                });
            }

            // ===== 异步初始化（不阻塞 setup 返回）=====

            // 9. 启动代理服务器
            let proxy_service_start = proxy_service.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = proxy_service_start.start().await {
                    tracing::error!("启动代理服务器失败: {}", e);
                }
            });

            // 10. 启动配置文件热重载监听器
            let yaml_repo_watcher = yaml_repo.clone();
            let services_watcher = services.clone();
            let access_points_watcher = access_points.clone();
            let config_tx_watcher = config_tx.clone();

            tauri::async_runtime::spawn(async move {
                let mut watcher = notify::recommended_watcher(
                    move |res: Result<notify::Event, notify::Error>| {
                        if let Ok(event) = res {
                            if event.kind.is_modify() {
                                tracing::info!("检测到配置文件变更, 重新加载...");
                                match yaml_repo_watcher.read() {
                                    Ok(new_config) => {
                                        let port = new_config.proxy_port;
                                        // 更新内存状态
                                        if let Ok(mut svcs) = services_watcher.try_write() {
                                            *svcs = new_config.services;
                                        }
                                        if let Ok(mut aps) = access_points_watcher.try_write() {
                                            *aps = new_config.access_points;
                                        }
                                        let _ = config_tx_watcher.send(port);
                                        tracing::info!("配置已热重载");
                                    }
                                    Err(e) => {
                                        tracing::error!("重新加载配置失败: {}", e);
                                    }
                                }
                            }
                        }
                    },
                )
                .expect("无法创建文件监听器");

                watcher
                    .watch(
                        &config_path,
                        notify::RecursiveMode::NonRecursive,
                    )
                    .ok();
            });

            // 11. 启动定时日志清理任务
            let log_service_cleanup = log_service.clone();
            tauri::async_runtime::spawn(async move {
                let mut interval =
                    tokio::time::interval(tokio::time::Duration::from_secs(3600));
                loop {
                    interval.tick().await;
                    match log_service_cleanup.cleanup_old_logs(retention_days) {
                        Ok(count) if count > 0 => {
                            tracing::info!("清理了 {} 条过期日志", count);
                        }
                        Err(e) => {
                            tracing::error!("清理日志失败: {}", e);
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![
            interface::commands::list_services,
            interface::commands::get_service,
            interface::commands::create_service,
            interface::commands::update_service,
            interface::commands::delete_service,
            interface::commands::list_access_points,
            interface::commands::get_access_point,
            interface::commands::create_access_point,
            interface::commands::update_access_point,
            interface::commands::delete_access_point,
            interface::commands::update_access_point_service,
            interface::commands::toggle_access_point,
            interface::commands::query_logs,
            interface::commands::get_log,
            interface::commands::clear_logs,
            interface::commands::get_config,
            interface::commands::update_proxy_port,
            interface::commands::update_log_settings,
            interface::commands::update_app_theme,
            interface::commands::update_start_minimized,
            interface::commands::get_proxy_status,
            interface::commands::restart_proxy,
        ])
        .run(tauri::generate_context!())
        .expect("启动 Token Proxy 失败");
}

fn resolve_config_path() -> PathBuf {
    if let Some(config_dir) = dirs::config_dir() {
        let dir = config_dir.join("token-proxy");
        std::fs::create_dir_all(&dir).ok();
        dir.join("config.yaml")
    } else {
        std::env::current_dir()
            .unwrap_or_else(|_| PathBuf::from("."))
            .join("config.yaml")
    }
}
