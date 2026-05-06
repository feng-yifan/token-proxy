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
│   ├── proxy/
│   │   ├── proxy_server.rs         # Axum 代理服务器
│   │   ├── request_handler.rs      # 请求处理 + 模型映射
│   │   └── logger.rs               # 日志记录
│   └── sanitize.rs                  # 输入消毒 (ANSI/控制字符过滤)
└── interface/       # 接口层 - 外部通信
    └── commands.rs                 # Tauri IPC 命令
```

#### 领域实体

- **ApiService** - API 服务 (名称、Base URL、API Key、模型列表、默认模型)
- **AccessPointService** - 接入点关联的服务配置 (关联的服务 ID、该服务的模型映射规则)
- **AccessPoint** - 接入点 (本地路径映射、关联服务列表、启用状态、客户端密钥)
- **ModelMapping** - 模型映射 (source: 客户端模型名 → target: 上游模型名，支持特殊值 __other__ 和 __default__)
- **AppConfig** - 应用配置 (代理端口、日志设置、主题设置、静默启动)
- **ProxyLog** - 代理日志 (请求元数据、时间戳、可选完整内容)

#### 应用服务

- **ServiceManagement** - API 服务 CRUD + 默认模型校验 (至少一个模型) + 级联清理 (删除服务时清理关联的接入点配置)
- **AccessPointManagement** - 接入点 CRUD + 多服务管理 + 服务级模型映射 + 切换激活服务 + 启用/禁用
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

1. **API 服务注册**: 在管理后台注册第三方 AI API 服务 (名称、URL、API Key、模型列表、默认模型)
2. **接入点管理**: 创建精确路径映射，将本地路径关联到多个 API 服务，每个服务独立配置模型映射规则，支持在列表中快速切换激活的服务
3. **透明代理**: 匹配接入点路径 -> 根据激活服务应用模型映射 (source → target) -> 注入 API Key -> 透传到远程服务 (支持接入点级别客户端鉴权)
4. **模型映射**: 接入点按服务分组配置模型映射规则，将客户端模型名 (如 Claude Code 的 claude-opus-4-7) 映射为上游 API 服务的模型名。支持特殊值 __other__ (匹配所有未显式映射的模型) 和 __default__ (使用服务的默认模型)
5. **请求日志**: 记录代理转发元数据，可选完整请求/响应内容
6. **配置热重载**: YAML 文件变更后通过 notify 自动加载
7. **单实例限制**: 使用 `tauri-plugin-single-instance` 限制应用多开，二次启动时聚焦已有窗口
8. **系统托盘与窗口管理**: 托盘区右键菜单 (显示窗口/退出)，关闭窗口最小化到托盘而非退出
9. **日志实时推送**: 代理服务器处理请求并写入日志后，通过 Tauri 事件机制主动推送新日志到前端，无需手动刷新
10. **主题切换**: 支持明亮 (light)、暗黑 (dark)、跟随系统 (system) 三种主题模式，通过 Tauri window API 与 Semi Design 主题系统联动实现
11. **静默启动**: 通过配置开关启用后，应用启动时自动最小化到系统托盘，仅在托盘区域显示图标，不干扰用户当前工作
12. **输入消毒**: 所有用户输入 (名称、路径、模型名等) 自动去除 ANSI 转义序列和控制字符，防止特殊字符注入

## Tauri IPC 命令一览

| 命令 | 功能 |
|------|------|
| `list_services` / `get_service` | 查询 API 服务列表/详情 |
| `create_service` / `update_service` / `delete_service` | API 服务 CRUD |
| `list_access_points` / `get_access_point` | 查询接入点列表/详情 |
| `create_access_point` / `update_access_point` / `delete_access_point` | 接入点 CRUD |
| `toggle_access_point` | 启用/禁用接入点 |
| `switch_access_point_service` | 切换接入点激活的服务 |
| `update_access_point_services` | 更新接入点的服务列表 |
| `query_logs` / `get_log` / `clear_logs` | 日志查询和管理 |
| `get_config` / `update_proxy_port` / `update_log_settings` / `update_app_theme` / `update_start_minimized` | 配置管理 |
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
- **模型映射优先级**: 接入点映射表 (source → target) > 服务模型列表透传 > default_model 回退。映射针对所有 API 类型生效，非仅 Anthropic
- **YAML 向后兼容**: 实体字段使用 `#[serde(default)]` 确保旧 YAML 配置自动兼容新版本字段 (aliases 和 header_rules 字段自动忽略)
- **管理后台鉴权**: 无需登录 (桌面应用 OS 级安全)
- **接入点客户端鉴权**: 接入点支持可选 `api_key` 字段，设置后代理验证客户端请求中的认证头 (`Authorization: Bearer <api_key>`)，未携带或无效密钥的请求被拒绝
- **上游认证头注入**: 根据关联 API 服务的 `api_type` 自动选择认证方式，Anthropic 使用 `x-api-key` + `anthropic-version`，OpenAI-Compatible 使用 `Authorization: Bearer`
- **协议支持**: Anthropic Messages API + OpenAI-Compatible 格式
- **配置目录**: OS 默认配置目录 (`dirs::config_dir()`)
- **窗口装饰**: 使用自定义标题栏 (TitleBar) 替代系统原生标题栏，通过设置 `decorations: false` 启用无边框窗口。标题栏左侧显示应用名称，中部为拖拽区域，右侧提供最小化、最大化/还原、关闭按钮
- **窗口关闭行为**: 关闭窗口时最小化到系统托盘，完全退出通过托盘菜单「退出」
- **静默启动**: 应用支持通过 `start_minimized` 配置项控制启动行为。启用后，在 `setup()` 中异步延迟 100ms 后调用 `window.hide()`，确保窗口首次渲染完成后再隐藏。仅下次启动生效，运行时切换不影响当前窗口。单实例二次启动时仍显示窗口，覆盖静默设置
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
- 输入消毒：前后端均需对用户输入调用 sanitize 函数。sanitize_input() 定义在 `infrastructure/sanitize.rs` (Rust) 和 `src/utils/sanitize.ts` (TypeScript)
