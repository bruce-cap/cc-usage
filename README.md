# cc-usage

`cc-usage` 是一个轻量级的本地用量看板，用来查看 Claude Code 会话日志中的 token 使用情况。

它会扫描本机 Claude 项目目录下的 `.jsonl` 日志文件，按日期和模型聚合用量数据，然后通过一个很小的本地 HTTP 服务，把结果展示在浏览器页面中。

## 项目简介

这个项目主要用于解决一个很实际的问题：Claude Code 的本地日志里已经记录了模型调用和 token 用量，但默认并没有一个轻便、直观、适合日常查看的本地看板。

`cc-usage` 目前提供这些能力：

- 递归读取 `~/.claude/projects` 下的本地会话日志
- 按日期聚合 token 用量
- 按模型聚合 token 用量
- 展示输入、输出和总 token 数
- 提供全部、近 30 天、近 7 天等时间窗口视图
- 通过本地 API 支持页面刷新和实时重载
- 支持导出聚合后的 JSON 报表和静态 HTML 构建产物

## 当前状态

这个仓库目前还是一个偏早期的本地工具原型。

当前最完整、最稳定的使用方式是本地 HTTP 服务模式：

1. 启动本地服务
2. 在浏览器中打开看板页面
3. 实时读取并聚合指定目录下的日志数据

仓库里也已经包含静态构建脚本，但当前前端页面主要还是围绕 `/api/report` 这条实时接口来工作的。因此，导出的静态 HTML 目前更像构建产物，而不是一个完全独立、离线可直接使用的报表查看器。

## 快速开始

### 运行环境

- Node.js 18 或更高版本

当前项目只使用 Node.js 内置模块，不依赖额外的第三方包，因此不需要安装依赖。

### 启动实时看板

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

### 构建报表产物

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
node --test tests/*.test.js
```

如果你更喜欢通过 `package.json` 脚本运行：

```bash
npm start
npm run build:report
npm test
```

## 实现方式

### 数据来源

服务会递归扫描配置目录下的 `.jsonl` 文件，默认目录是：

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

### 本地服务

本地 HTTP 服务目前提供两个主要入口：

- `GET /`：返回看板页面
- `GET /api/report`：返回实时聚合后的 JSON 数据

## 目录结构

```text
.
├─ public/
│  └─ index.html
├─ scripts/
│  └─ build-report.js
├─ src/
│  ├─ live-report-server.js
│  ├─ report-payload.js
│  └─ usage-aggregator.js
├─ tests/
│  ├─ fixtures/
│  ├─ live-report-server.test.js
│  └─ usage-aggregator.test.js
├─ server.js
└─ package.json
```

## 开发说明

- 项目刻意保持轻量，当前只依赖 Node.js 内置模块
- 前端页面使用原生 HTML、CSS 和 JavaScript，没有引入前端框架
- 当前实现优先服务本地个人使用场景，还没有按通用生产部署方向去做扩展

## 测试

运行测试：

```bash
node --test tests/*.test.js
```

当前测试覆盖了这些核心路径：

- 按日期和模型聚合用量
- 最近时间窗口过滤
- 重复 assistant 快照记录的处理
- `/` 和 `/api/report` 的服务端响应

## 已知限制

- 当前主路径是本地实时服务模式，不是完全独立的离线 HTML 报表模式
- 当前前端默认假设数据来自 `/api/report`
- 成本数据是否完整，取决于源日志记录中是否包含对应字段
- 这个工具依赖当前 Claude 本地日志的结构，如果上游日志格式发生变化，聚合逻辑可能需要调整

## 后续可扩展方向

- 把静态导出做成真正可离线打开的完整报表
- 增加更丰富的图表和拆分维度
- 支持更多筛选条件
- 提升大规模日志目录下的扫描和聚合性能

## License

本仓库当前使用 `MIT` 许可证，详见 [LICENSE](C:/Users/Cap/Desktop/cc-usage/LICENSE:1)。
