# token-proxy

大模型 AI API 服务透明代理桌面应用。

## 技术栈

- **后端**: Rust + Tauri 2 + axum (嵌入式 HTTP 代理服务器)
- **前端**: React 19 + TypeScript + Semi Design + React Router
- **数据存储**: YAML 配置文件 (主配置) + SQLite/rusqlite (运行时缓存和日志)
- **跨平台**: Windows / macOS / Linux (通过 Tauri)

## 架构

### 后端 DDD 四层架构

`src-tauri/src/` 遵循领域驱动设计 (DDD) 四层架构:

```
src-tauri/src/
├── domain/          # 领域层 - 核心业务实体和规则
│   ├── api_service.rs    # API 服务实体
│   ├── access_point.rs   # 接入点实体
│   ├── app_config.rs     # 应用配置实体
│   ├── proxy_log.rs      # 代理日志实体
│   └── mod.rs
├── application/     # 应用服务层 - 用例编排
│   ├── service_management.rs       # API 服务管理
│   ├── access_point_management.rs  # 接入点管理
│   ├── proxy_service.rs            # 代理服务
│   ├── log_service.rs              # 日志服务
│   ├── config_service.rs           # 配置服务
│   └── mod.rs
├── infrastructure/  # 基础设施层 - 技术实现
│   ├── persistence/
│   │   ├── yaml_config.rs          # YAML 配置持久化
│   │   └── sqlite_repository.rs    # SQLite 存储
│   └── proxy/
│       ├── proxy_server.rs         # Axum 代理服务器
│       ├── request_handler.rs      # 请求处理
│       └── logger.rs               # 日志记录
└── interface/       # 接口层 - 外部通信
    └── commands.rs                 # Tauri IPC 命令
```

#### 领域实体

- **ApiService** - API 服务 (名称、Base URL、API Key)
- **AccessPoint** - 接入点 (本地路径映射、关联服务、启用状态)
- **AppConfig** - 应用配置 (代理端口、日志设置、主题设置)
- **ProxyLog** - 代理日志 (请求元数据、时间戳、可选完整内容)

#### 应用服务

- **ServiceManagement** - API 服务 CRUD + 级联检查 (删除时检查关联接入点)
- **AccessPointManagement** - 接入点 CRUD + 启用/禁用
- **ProxyService** - 启动/停止 Axum 代理服务器
- **LogService** - 日志查询 + 定时过期清理
- **ConfigService** - 配置读写 + 同步 YAML

### 前端架构

```
src/
├── types/          # TypeScript 类型定义
├── services/       # Tauri IPC invoke 封装
├── components/     # 可复用组件 (Layout, Sidebar, StatusBar, TitleBar)
├── hooks/          # 自定义 React Hooks
├── utils/          # 工具函数 (主题切换、错误处理等)
├── pages/          # 页面组件
│   ├── ServicesPage
│   ├── AccessPointsPage
│   ├── LogsPage
│   └── SettingsPage
├── assets/
├── styles/
├── App.tsx
└── main.tsx
```

## 核心功能

1. **API 服务注册**: 在管理后台注册第三方 AI API 服务 (名称、URL、API Key)
2. **接入点管理**: 创建精确路径映射，将本地路径关联到已注册 API 服务
3. **透明代理**: 匹配接入点路径 -> 注入 API Key -> 透传到远程服务
4. **请求日志**: 记录代理转发元数据，可选完整请求/响应内容
5. **配置热重载**: YAML 文件变更后通过 notify 自动加载
6. **单实例限制**: 使用 `tauri-plugin-single-instance` 限制应用多开，二次启动时聚焦已有窗口
7. **系统托盘与窗口管理**: 托盘区右键菜单 (显示窗口/退出)，关闭窗口最小化到托盘而非退出
8. **日志实时推送**: 代理服务器处理请求并写入日志后，通过 Tauri 事件机制主动推送新日志到前端，无需手动刷新
9. **主题切换**: 支持明亮 (light)、暗黑 (dark)、跟随系统 (system) 三种主题模式，通过 Tauri window API 与 Semi Design 主题系统联动实现

## Tauri IPC 命令一览

| 命令 | 功能 |
|------|------|
| `list_services` / `get_service` | 查询 API 服务列表/详情 |
| `create_service` / `update_service` / `delete_service` | API 服务 CRUD |
| `list_access_points` / `get_access_point` | 查询接入点列表/详情 |
| `create_access_point` / `update_access_point` / `delete_access_point` | 接入点 CRUD |
| `toggle_access_point` | 启用/禁用接入点 |
| `query_logs` / `get_log` / `clear_logs` | 日志查询和管理 |
| `get_config` / `update_proxy_port` / `update_log_settings` / `update_app_theme` | 配置管理 |
| `get_proxy_status` / `restart_proxy` | 代理状态管理 |

### Tauri Events

| 事件 | 方向 | 功能 |
|------|------|------|
| `proxy-log-new` | 后端 -> 前端 | 新日志写入后实时推送，负载为 `ProxyLog` 对象 |

## 关键技术决策

- **前后端通信**: Tauri IPC (invoke)，非 HTTP REST
- **接入点映射**: 精确路径匹配 (如 /v1/chat/completions)
- **代理端口**: 默认 9876，管理后台可配置
- **数据源关系**: YAML 为主配置源，SQLite 为运行时缓存，双向同步 + notify 热重载
- **管理后台鉴权**: 无需登录 (桌面应用 OS 级安全)
- **协议支持**: Anthropic Messages API + OpenAI-Compatible 格式
- **配置目录**: OS 默认配置目录 (`dirs::config_dir()`)
- **窗口装饰**: 使用自定义标题栏 (TitleBar) 替代系统原生标题栏，通过设置 `decorations: false` 启用无边框窗口。标题栏左侧显示应用名称，中部为拖拽区域，右侧提供最小化、最大化/还原、关闭按钮
- **窗口关闭行为**: 关闭窗口时最小化到系统托盘，完全退出通过托盘菜单「退出」
- **单实例方案**: 使用 `tauri-plugin-single-instance` 插件实现单实例限制，二次启动时聚焦已有窗口
- **日志实时推送**: 使用 `tokio::sync::broadcast::channel` (256 容量) 而非 mpsc，支持未来多消费者扩展。独立 tokio task 消费 broadcast 并转发 Tauri 事件，与代理请求处理解耦。非阻塞发送 (`let _ = sender.send(...)`)，队列满时丢弃不阻塞代理请求
- **主题切换**: 通过 Tauri 的 `window.theme()` 和 `window.setTheme()` API 控制窗口标题栏主题，同时在 `<body>` 上设置/移除 `theme-mode` 属性以驱动 Semi Design 组件主题。配置文件中存储 `app_theme` 字段 ("light" / "dark" / "system")，默认值为 "system"。选择 "system" 时通过 `onThemeChanged` 事件监听系统主题变化并自动同步

## 命令

```bash
pnpm dev              # 启动 Vite 开发服务器
pnpm tauri dev        # 启动 Tauri 桌面应用 (含热重载)
pnpm tauri build      # 构建桌面应用
cd src-tauri && cargo build  # 编译 Rust 后端
cd src-tauri && cargo test   # 运行 Rust 测试
```

## 开发约定

- 后端新增实体时，需在 `domain/` 中定义结构体，在 `application/` 中实现业务逻辑，在 `interface/commands.rs` 中注册 IPC 命令
- 前端新增页面时，在 `src/pages/` 创建，在 `src/services/` 封装 invoke 调用，在 `App.tsx` 配置路由
- YAML 配置变更后自动热重载，无需重启应用
- 日志保留天数通过管理后台配置，默认定时清理 (1 小时间隔)
- 实时推送功能需在 `lib.rs` 的 `setup()` 中创建 broadcast channel，注入 `AppState`，在代理层 (`proxy_server.rs` / `logger.rs`) 发送事件，在前端使用 `listen()` 监听
