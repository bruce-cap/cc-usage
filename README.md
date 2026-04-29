# cc-usage

`cc-usage` 是一个轻量级的本地用量看板，用来查看 Claude Code 会话日志中的 token 使用情况。

它现在同时支持两种运行方式：

- VS Code 侧边栏插件模式
- 本地 HTTP 服务的旧版浏览器模式

两种模式都使用同一套本地日志聚合核心，默认读取 `~/.claude/projects`。

## 项目简介

这个项目主要用于解决一个很实际的问题：Claude Code 的本地日志里已经记录了模型调用和 token 用量，但默认并没有一个轻便、直观、适合日常查看的本地看板。

`cc-usage` 目前提供这些能力：

- 递归读取 `~/.claude/projects` 下的本地会话日志
- 按日期聚合 token 用量
- 按模型聚合 token 用量
- 展示输入、输出和总 token 数
- 提供全部、近 30 天、近 7 天等时间窗口视图
- 在 VS Code 侧边栏中查看用量仪表盘
- 支持手动刷新和 2 分钟自动刷新
- 通过本地 API 支持旧版浏览器页面刷新和实时重载
- 支持导出聚合后的 JSON 报表和静态 HTML 构建产物

## 当前状态

这个仓库目前已经进入“本地插件原型”阶段。

当前推荐的使用方式是 VS Code 插件开发模式：

1. 启动本地服务
2. 在 Extension Development Host 中打开 `CC Usage`
3. 在侧边栏直接查看实时聚合后的本地用量数据

同时，仓库里仍然保留旧版浏览器模式和静态构建脚本，方便调试、对照和兼容使用。

## 快速开始

### 运行环境

- Node.js 18 或更高版本

当前项目只使用 Node.js 内置模块，不依赖额外的第三方包，因此不需要安装依赖。

### 启动 VS Code 插件开发模式

1. 用 VS Code 打开本仓库
2. 按 `F5`
3. 在新打开的 Extension Development Host 窗口中，点击 Activity Bar 里的 `CC Usage`
4. 侧边栏会默认读取 `~/.claude/projects`
5. 面板支持手动刷新，并会每 2 分钟自动刷新一次

### 启动旧版浏览器模式

```bash
node server.js
```

默认情况下，服务会：

- 监听 `http://127.0.0.1:3000`
- 从 `~/.claude/projects` 读取日志

你也可以手动指定端口和源目录：

```bash
node server.js 3001 C:\path\to\projects
```

如果源目录以 `~/` 开头，程序会自动把它展开为当前用户的 home 目录。

### 构建静态报表产物

```bash
node scripts/build-report.js
```

默认会把输出写到 `dist/`：

- `dist/report.json`
- `dist/index.html`

你也可以手动指定源目录和输出目录：

```bash
node scripts/build-report.js C:\path\to\projects C:\path\to\output
```

## 可用命令

直接使用 Node 命令：

```bash
node server.js
node scripts/build-report.js
node --test tests
```

如果你更喜欢通过 `package.json` 脚本运行：

```bash
npm start
npm run build:report
npm test
```

## 实现方式

### 数据来源

插件和旧版服务都会递归扫描配置目录下的 `.jsonl` 文件，默认目录是：

```text
~/.claude/projects
```

每个文件都会按行读取，并把每一行按 newline-delimited JSON 解析。

当前聚合器主要支持两类记录：

- 带有 `modelUsage` 的 `result` 记录
- 带有 `message.model` 和 `message.usage` 的 `assistant` 记录

### 聚合逻辑

当前会生成三类核心结果：

- 每日汇总
- 按模型汇总
- 全局摘要信息，例如总 token、文件数、记录数

返回给前端的报表数据中，还会预先计算几个时间窗口：

- 全部数据
- 近 30 天
- 近 7 天

### VS Code 插件结构

- `src/core/`：可复用的日志聚合核心
- `src/webview/`：VS Code 侧边栏视图接入层
- `media/`：侧边栏页面的静态资源

### 旧版本地服务

本地 HTTP 服务目前提供两个主要入口：

- `GET /`：返回看板页面
- `GET /api/report`：返回实时聚合后的 JSON 数据

## 目录结构

```text
.
├─ public/
│  └─ index.html
├─ media/
│  ├─ icon.svg
│  ├─ view.css
│  └─ view.js
├─ scripts/
│  └─ build-report.js
├─ src/
│  ├─ core/
│  │  ├─ path-utils.js
│  │  ├─ report-payload.js
│  │  └─ usage-aggregator.js
│  ├─ legacy/
│  │  └─ live-report-server.js
│  ├─ webview/
│  │  ├─ usage-view-provider.js
│  │  └─ webview-template.js
│  └─ extension.js
├─ tests/
│  ├─ fixtures/
│  ├─ extension-metadata.test.js
│  ├─ live-report-server.test.js
│  ├─ path-utils.test.js
│  ├─ report-payload.test.js
│  ├─ usage-view-provider.test.js
│  └─ usage-aggregator.test.js
├─ .vscode/
│  ├─ launch.json
│  └─ tasks.json
├─ server.js
└─ package.json
```

## 开发说明

- 项目刻意保持轻量，当前只依赖 Node.js 内置模块
- 前端页面使用原生 HTML、CSS 和 JavaScript，没有引入前端框架
- 当前实现优先服务本地个人使用场景，先以插件开发和本机验证为主

## 测试

运行测试：

```bash
node --test tests
```

当前测试覆盖了这些核心路径：

- 扩展元数据和侧边栏 Provider 暴露
- 按日期和模型聚合用量
- 报表 payload 装配
- 最近时间窗口过滤
- 重复 assistant 快照记录的处理
- `/` 和 `/api/report` 的服务端响应

## 已知限制

- 当前首版主要面向本地桌面版 VS Code
- 当前没有提供自定义日志目录配置，默认固定读取 `~/.claude/projects`
- 当前旧版浏览器模式仍然依赖 `/api/report`
- 成本数据是否完整，取决于源日志记录中是否包含对应字段
- 这个工具依赖当前 Claude 本地日志的结构，如果上游日志格式发生变化，聚合逻辑可能需要调整

## 后续可扩展方向

- 增加插件设置项，支持自定义日志目录
- 补更完整的侧边栏主题适配和 UI 打磨
- 发布为可安装的 VS Code 扩展包
- 把静态导出做成真正可离线打开的完整报表
- 增加更丰富的图表和拆分维度
- 支持更多筛选条件
- 提升大规模日志目录下的扫描和聚合性能

## License

本仓库当前使用 `MIT` 许可证，详见 [LICENSE](C:/Users/Cap/Desktop/cc-usage/LICENSE:1)。
