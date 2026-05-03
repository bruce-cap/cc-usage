# cc-usage

`cc-usage` 是一个本地用量看板，用来读取 Claude Code 的本地会话日志，并按日期、模型和时间窗口聚合 token 使用情况。

当前项目已经支持两种使用方式：

- VS Code 侧边栏插件模式
- 本地 HTTP 服务模式

两种模式共用同一套日志扫描和聚合核心，默认读取 `~/.claude/projects`。

## 当前进度

这个仓库目前已经完成了第一版可用原型，状态大致是：

- 核心日志聚合逻辑已完成
- VS Code 侧边栏视图已接通
- 支持手动刷新
- 支持每 2 分钟自动刷新
- 保留了旧版浏览器模式，便于调试和对照
- 已有基础测试覆盖核心聚合和本地服务行为

换句话说，它已经能在本地实际使用，但还没有做到一个准备直接发布到 Marketplace 的成熟扩展。

## 功能特性

- 递归扫描 `~/.claude/projects` 下的 `.jsonl` 日志
- 按日期聚合 token 用量
- 按模型聚合 token 用量
- 展示输入、输出和总 token 数
- 支持 `All / 30d / 7d` 时间窗口切换
- 在 VS Code 侧边栏中查看仪表盘
- 支持手动刷新和自动刷新
- 支持导出聚合后的 JSON 和静态 HTML 报表

## 项目结构

```text
.
├─ media/                  # VS Code Webview 静态资源
├─ public/                 # 旧版浏览器页面
├─ scripts/                # 构建脚本
├─ src/
│  ├─ core/                # 可复用的日志聚合核心
│  ├─ legacy/              # 旧版本地 HTTP 服务
│  ├─ webview/             # VS Code 侧边栏接入层
│  └─ extension.js         # VS Code 扩展入口
├─ tests/                  # 单元测试和测试数据
├─ server.js               # 旧版浏览器模式入口
└─ package.json
```

## 环境要求

- Node.js 18 或更高版本
- VS Code（如果要使用插件模式）

当前项目只依赖 Node.js 内置模块，不需要额外安装运行时依赖。

## 快速开始

### 方式一：以 VS Code 插件开发模式运行

1. 用 VS Code 打开本仓库
2. 按 `F5`
3. 在新打开的 Extension Development Host 窗口中点击左侧 `CC Usage`
4. 插件会默认读取 `~/.claude/projects`

### 方式二：以本地 HTTP 服务模式运行

```bash
node server.js
```

默认监听：

```text
http://127.0.0.1:3000
```

你也可以手动指定端口和源目录：

```bash
node server.js 3001 /path/to/projects
```

在 Windows 下也可以传入类似：

```bash
node server.js 3001 C:\path\to\projects
```

## 构建静态报表

```bash
node scripts/build-report.js
```

默认输出到：

- `dist/report.json`
- `dist/index.html`

也可以手动指定输入目录和输出目录：

```bash
node scripts/build-report.js /path/to/projects /path/to/output
```

## 测试

运行全部测试：

```bash
node --test tests
```

或者：

```bash
npm test
```

当前测试覆盖：

- 扩展元数据和视图注册约束
- 日志聚合逻辑
- 报表 payload 装配
- 最近时间窗口过滤
- 本地 HTTP 服务响应

## 已知限制

- 当前默认日志目录固定为 `~/.claude/projects`
- 还没有设置页，不能在 UI 中修改日志目录
- 当前主要面向本地桌面版 VS Code
- 当前旧版浏览器模式仍依赖 `/api/report`
- 如果上游日志格式变化，聚合逻辑可能需要同步调整

## 后续计划

- 增加插件设置项，支持自定义日志目录
- 补更完整的错误提示和状态展示
- 打磨侧边栏 UI 和主题适配
- 增加更多统计维度
- 打包成可安装的 VS Code 扩展

## License

MIT。详见 [LICENSE](./LICENSE)。
