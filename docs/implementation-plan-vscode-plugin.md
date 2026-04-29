# CC Usage VS Code 插件实施计划

> **给执行型智能体的要求：** 实施本计划时，必须使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 技能，按任务逐项推进。本文中的步骤统一使用 `- [ ]` 复选框格式，便于跟踪执行状态。

**目标：** 把现有 `cc-usage` 本地网页工具升级成一个可在 VS Code 侧边栏运行的本地插件，默认读取 `~/.claude/projects`，支持 2 分钟自动刷新和手动刷新。

**总体架构：** 首版继续保留现有日志聚合逻辑，把 VS Code 扩展宿主作为新的运行入口，用 `WebviewView` 作为侧边栏 UI 容器。扩展宿主负责读取本地日志、调用聚合逻辑、管理刷新和错误处理，Webview 只负责渲染和交互。

**技术栈：** Node.js CommonJS、VS Code Extension API、Webview HTML/CSS/JS、Node 内置 `node:test`

---

## 一、文件结构调整

### 1. 需要新增的文件

- 新建：`C:\Users\Cap\Desktop\cc-usage\src\extension.js`
- 新建：`C:\Users\Cap\Desktop\cc-usage\src\core\path-utils.js`
- 新建：`C:\Users\Cap\Desktop\cc-usage\src\webview\usage-view-provider.js`
- 新建：`C:\Users\Cap\Desktop\cc-usage\src\webview\webview-template.js`
- 新建：`C:\Users\Cap\Desktop\cc-usage\media\view.css`
- 新建：`C:\Users\Cap\Desktop\cc-usage\media\view.js`
- 新建：`C:\Users\Cap\Desktop\cc-usage\tests\report-payload.test.js`
- 新建：`C:\Users\Cap\Desktop\cc-usage\tests\path-utils.test.js`
- 新建：`C:\Users\Cap\Desktop\cc-usage\.vscode\launch.json`
- 新建：`C:\Users\Cap\Desktop\cc-usage\.vscode\tasks.json`

### 2. 需要移动或重组的文件

- 移动：`C:\Users\Cap\Desktop\cc-usage\src\usage-aggregator.js` -> `C:\Users\Cap\Desktop\cc-usage\src\core\usage-aggregator.js`
- 移动：`C:\Users\Cap\Desktop\cc-usage\src\report-payload.js` -> `C:\Users\Cap\Desktop\cc-usage\src\core\report-payload.js`
- 移动：`C:\Users\Cap\Desktop\cc-usage\src\live-report-server.js` -> `C:\Users\Cap\Desktop\cc-usage\src\legacy\live-report-server.js`

### 3. 需要修改的文件

- 修改：`C:\Users\Cap\Desktop\cc-usage\package.json`
- 修改：`C:\Users\Cap\Desktop\cc-usage\server.js`
- 修改：`C:\Users\Cap\Desktop\cc-usage\tests\usage-aggregator.test.js`
- 修改：`C:\Users\Cap\Desktop\cc-usage\tests\live-report-server.test.js`
- 修改：`C:\Users\Cap\Desktop\cc-usage\README.md`

---

## 二、任务拆解

### 任务 1：把仓库变成一个可识别的 VS Code 扩展项目

**涉及文件：**
- 修改：`C:\Users\Cap\Desktop\cc-usage\package.json`
- 新建：`C:\Users\Cap\Desktop\cc-usage\src\extension.js`
- 新建：`C:\Users\Cap\Desktop\cc-usage\.vscode\launch.json`
- 新建：`C:\Users\Cap\Desktop\cc-usage\.vscode\tasks.json`

- [ ] **步骤 1：先补一个针对扩展入口元数据的失败预期**

后续 `package.json` 改完以后，至少应满足下面这样的断言：

```js
const pkg = require('../package.json');

test('package.json 暴露了 VS Code 扩展入口', () => {
  assert.equal(pkg.main, './src/extension.js');
  assert.ok(pkg.engines?.vscode);
});
```

- [ ] **步骤 2：在修改元数据之前，先跑现有测试，确认基线稳定**

运行命令：

```bash
node --test tests/*.test.js
```

预期结果：

- 当前已有测试通过
- 说明在开始插件化改造之前，原始基线是稳定的

- [ ] **步骤 3：在 `package.json` 中加入 VS Code 扩展元数据**

在保留当前脚本的前提下，补充这些字段：

```json
{
  "main": "./src/extension.js",
  "engines": {
    "vscode": "^1.90.0"
  },
  "activationEvents": [
    "onView:ccUsage.sidebarView",
    "onCommand:ccUsage.refresh"
  ],
  "contributes": {
    "viewsContainers": {
      "activitybar": [
        {
          "id": "ccUsage",
          "title": "CC Usage",
          "icon": "media/icon.svg"
        }
      ]
    },
    "views": {
      "ccUsage": [
        {
          "id": "ccUsage.sidebarView",
          "name": "Usage Dashboard"
        }
      ]
    },
    "commands": [
      {
        "command": "ccUsage.refresh",
        "title": "CC Usage: Refresh"
      }
    ]
  }
}
```

- [ ] **步骤 4：创建最小可用的扩展入口文件**

创建 `src/extension.js`：

```js
function activate(context) {
  void context;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
```

- [ ] **步骤 5：补齐 VS Code 调试脚手架**

创建 `launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run CC Usage Extension",
      "type": "extensionHost",
      "request": "launch",
      "runtimeExecutable": "${execPath}",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ]
    }
  ]
}
```

创建 `tasks.json`：

```json
{
  "version": "2.0.0",
  "tasks": []
}
```

- [ ] **步骤 6：修改后重新跑测试**

运行命令：

```bash
node --test tests/*.test.js
```

预期结果：

- 现有测试仍然通过
- 说明只是补充扩展元数据，没有破坏当前 Node 运行逻辑

- [ ] **步骤 7：在 VS Code 里手动验证扩展是否可被识别**

操作方式：

- 在 VS Code 中按 `F5`

预期结果：

- 能打开一个 Extension Development Host 窗口
- 不会在启动时立即报扩展激活错误

- [ ] **步骤 8：提交这一阶段改动**

```bash
git add package.json src/extension.js .vscode/launch.json .vscode/tasks.json
git commit -m "feat: add vscode extension shell"
```

---

### 任务 2：把核心逻辑整理成插件可复用结构

**涉及文件：**
- 新建：`C:\Users\Cap\Desktop\cc-usage\src\core\path-utils.js`
- 移动：`C:\Users\Cap\Desktop\cc-usage\src\usage-aggregator.js`
- 移动：`C:\Users\Cap\Desktop\cc-usage\src\report-payload.js`
- 移动：`C:\Users\Cap\Desktop\cc-usage\src\live-report-server.js`
- 修改：`C:\Users\Cap\Desktop\cc-usage\server.js`
- 新建：`C:\Users\Cap\Desktop\cc-usage\tests\path-utils.test.js`
- 修改：`C:\Users\Cap\Desktop\cc-usage\tests\usage-aggregator.test.js`
- 修改：`C:\Users\Cap\Desktop\cc-usage\tests\live-report-server.test.js`

- [ ] **步骤 1：先给路径工具写失败测试**

创建 `tests/path-utils.test.js`：

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');

const { resolveHomePath, getDefaultClaudeProjectsPath } = require('../src/core/path-utils.js');

test('resolveHomePath 可以展开波浪线路径', () => {
  assert.equal(resolveHomePath('~/.claude/projects'), path.join(os.homedir(), '.claude', 'projects'));
});

test('getDefaultClaudeProjectsPath 返回 Claude 默认日志目录', () => {
  assert.equal(getDefaultClaudeProjectsPath(), path.join(os.homedir(), '.claude', 'projects'));
});
```

- [ ] **步骤 2：把现有核心文件移动到更清晰的位置**

执行这些结构调整：

```text
src/usage-aggregator.js -> src/core/usage-aggregator.js
src/report-payload.js -> src/core/report-payload.js
src/live-report-server.js -> src/legacy/live-report-server.js
```

预期结果：

- 这一步只改位置，不改行为

- [ ] **步骤 3：新增共享路径工具**

创建 `src/core/path-utils.js`：

```js
const os = require('node:os');
const path = require('node:path');

function resolveHomePath(input) {
  if (!input) {
    return input;
  }

  if (input.startsWith('~/')) {
    return path.join(os.homedir(), input.slice(2));
  }

  return input;
}

function getDefaultClaudeProjectsPath() {
  return path.join(os.homedir(), '.claude', 'projects');
}

module.exports = {
  getDefaultClaudeProjectsPath,
  resolveHomePath,
};
```

- [ ] **步骤 4：把引用路径全部改到新结构**

修改 `server.js`：

```js
const path = require('node:path');

const { createLiveReportServer } = require('./src/legacy/live-report-server.js');
const { getDefaultClaudeProjectsPath, resolveHomePath } = require('./src/core/path-utils.js');

const port = Number(process.env.PORT || process.argv[2] || 3000);
const sourceDir = resolveHomePath(process.argv[3]) || getDefaultClaudeProjectsPath();

const server = createLiveReportServer({
  sourceDir,
  publicDir: path.join(__dirname, 'public'),
});
```

修改 `src/legacy/live-report-server.js` 中的引用：

```js
const { buildReportPayload } = require('../core/report-payload.js');
const { resolveHomePath } = require('../core/path-utils.js');
```

修改 `src/core/report-payload.js` 中的引用：

```js
const {
  aggregateUsageFromFiles,
  collectJsonlFiles,
  summarizeWindow,
} = require('./usage-aggregator.js');
```

- [ ] **步骤 5：更新测试里的模块路径**

例如：

```js
const { aggregateUsageFromFiles } = require('../src/core/usage-aggregator.js');
const { createLiveReportServer } = require('../src/legacy/live-report-server.js');
```

- [ ] **步骤 6：跑测试确认搬迁不影响行为**

运行命令：

```bash
node --test tests/*.test.js
```

预期结果：

- 聚合器测试和本地服务测试通过

- [ ] **步骤 7：提交这一阶段改动**

```bash
git add src/core src/legacy server.js tests/path-utils.test.js tests/usage-aggregator.test.js tests/live-report-server.test.js
git commit -m "refactor: reorganize core modules for vscode plugin reuse"
```

---

### 任务 3：注册一个真实可见的侧边栏视图

**涉及文件：**
- 修改：`C:\Users\Cap\Desktop\cc-usage\src\extension.js`
- 新建：`C:\Users\Cap\Desktop\cc-usage\src\webview\usage-view-provider.js`

- [ ] **步骤 1：先定义 Provider 形态的最小预期**

后续模块至少应该满足下面这种形态：

```js
const { UsageViewProvider, USAGE_VIEW_TYPE } = require('../src/webview/usage-view-provider.js');

assert.equal(USAGE_VIEW_TYPE, 'ccUsage.sidebarView');
assert.equal(typeof UsageViewProvider, 'function');
```

- [ ] **步骤 2：实现初版侧边栏 Provider**

创建 `src/webview/usage-view-provider.js`：

```js
const USAGE_VIEW_TYPE = 'ccUsage.sidebarView';

class UsageViewProvider {
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
    this.view = null;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };
    webviewView.webview.html = '<html><body><h2>CC Usage</h2><p>Loading plugin shell...</p></body></html>';
  }
}

module.exports = {
  UsageViewProvider,
  USAGE_VIEW_TYPE,
};
```

- [ ] **步骤 3：在 `extension.js` 中注册视图和刷新命令**

把占位版 `activate()` 改成这样：

```js
const vscode = require('vscode');
const { UsageViewProvider, USAGE_VIEW_TYPE } = require('./webview/usage-view-provider.js');

function activate(context) {
  const provider = new UsageViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(USAGE_VIEW_TYPE, provider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('ccUsage.refresh', async () => {
      if (typeof provider.refresh === 'function') {
        await provider.refresh();
      }
    }),
  );
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
```

- [ ] **步骤 4：在 VS Code 中手动验证侧边栏视图是否出现**

操作方式：

- 按 `F5`

预期结果：

- Activity Bar 中出现 `CC Usage`
- 点击后能看到名为 `Usage Dashboard` 的视图
- 视图里先显示占位 HTML

- [ ] **步骤 5：提交这一阶段改动**

```bash
git add src/extension.js src/webview/usage-view-provider.js
git commit -m "feat: register cc usage sidebar view"
```

---

### 任务 4：把现有页面迁移成 Webview 可用资源

**涉及文件：**
- 新建：`C:\Users\Cap\Desktop\cc-usage\src\webview\webview-template.js`
- 新建：`C:\Users\Cap\Desktop\cc-usage\media\view.css`
- 新建：`C:\Users\Cap\Desktop\cc-usage\media\view.js`
- 修改：`C:\Users\Cap\Desktop\cc-usage\src\webview\usage-view-provider.js`

- [ ] **步骤 1：把当前页面里的内联 CSS 抽到 `media/view.css`**

先把 `public/index.html` 中的样式完整迁出，再逐步把硬编码颜色替换成 VS Code 变量。例如：

```css
:root {
  color-scheme: light dark;
  --bg: var(--vscode-sideBar-background);
  --panel: var(--vscode-editorWidget-background);
  --text: var(--vscode-editor-foreground);
  --muted: var(--vscode-descriptionForeground);
  --accent: var(--vscode-button-background);
}
```

- [ ] **步骤 2：把当前页面行为抽到 `media/view.js`**

从现有页面脚本出发，但删掉 `fetch('/api/report')` 逻辑，改成 VS Code 通信模型：

```js
const vscode = acquireVsCodeApi();

window.addEventListener('message', (event) => {
  const message = event.data;
  if (message.type === 'loading') {
    setMeta('Refreshing...');
    return;
  }
  if (message.type === 'reportData') {
    render(message.payload, currentWindowKey);
    return;
  }
  if (message.type === 'error') {
    showError(message.message);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  vscode.postMessage({ type: 'ready' });
});
```

- [ ] **步骤 3：创建 Webview HTML 模板生成器**

创建 `src/webview/webview-template.js`：

```js
function getWebviewHtml(webview, extensionUri) {
  const vscode = require('vscode');
  const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'view.css'));
  const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'view.js'));
  const nonce = String(Date.now());

  return `<!doctype html>
  <html lang="zh-CN">
    <head>
      <meta charset="utf-8" />
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="stylesheet" href="${cssUri}">
      <title>CC Usage</title>
    </head>
    <body>
      <main class="page">
        <section class="panel">
          <div id="app"></div>
        </section>
      </main>
      <script nonce="${nonce}" src="${jsUri}"></script>
    </body>
  </html>`;
}

module.exports = {
  getWebviewHtml,
};
```

- [ ] **步骤 4：让 Provider 改用模板文件生成 HTML**

更新 `resolveWebviewView()`：

```js
const { getWebviewHtml } = require('./webview-template.js');

resolveWebviewView(webviewView) {
  this.view = webviewView;
  webviewView.webview.options = {
    enableScripts: true,
    localResourceRoots: [this.extensionUri],
  };
  webviewView.webview.html = getWebviewHtml(webviewView.webview, this.extensionUri);
}
```

- [ ] **步骤 5：手动验证页面是否已经在 Webview 中加载**

操作方式：

- 按 `F5`

预期结果：

- 占位 HTML 被真实页面结构替换
- 样式来自 `media/view.css`
- Webview 控制台里不再出现 `fetch('/api/report')` 相关错误

- [ ] **步骤 6：提交这一阶段改动**

```bash
git add src/webview/webview-template.js src/webview/usage-view-provider.js media/view.css media/view.js
git commit -m "feat: migrate dashboard ui into vscode webview assets"
```

---

### 任务 5：通过宿主与 Webview 通信接入真实数据

**涉及文件：**
- 修改：`C:\Users\Cap\Desktop\cc-usage\src\webview\usage-view-provider.js`
- 修改：`C:\Users\Cap\Desktop\cc-usage\src\webview\webview-template.js`
- 修改：`C:\Users\Cap\Desktop\cc-usage\media\view.js`
- 新建：`C:\Users\Cap\Desktop\cc-usage\tests\report-payload.test.js`

- [ ] **步骤 1：先给 `buildReportPayload()` 写一个失败测试**

创建 `tests/report-payload.test.js`，直接复用现有 fixture：

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { buildReportPayload } = require('../src/core/report-payload.js');

test('buildReportPayload 返回窗口数据和汇总信息', async () => {
  const fixtureDir = path.join(__dirname, 'fixtures');
  const payload = await buildReportPayload(fixtureDir);

  assert.ok(payload.generatedAt);
  assert.ok(payload.sourceDir.endsWith('fixtures'));
  assert.ok(Array.isArray(payload.windows.all));
  assert.ok(Array.isArray(payload.windows.days30));
  assert.ok(Array.isArray(payload.windows.days7));
  assert.ok(payload.report.summary.totalTokens > 0);
});
```

- [ ] **步骤 2：给 Provider 加上 `refresh()` 方法**

更新 `src/webview/usage-view-provider.js`：

```js
const { buildReportPayload } = require('../core/report-payload.js');
const { getDefaultClaudeProjectsPath } = require('../core/path-utils.js');

class UsageViewProvider {
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
    this.view = null;
    this.isRefreshing = false;
  }

  async refresh() {
    if (!this.view || this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;
    this.view.webview.postMessage({ type: 'loading' });

    try {
      const payload = await buildReportPayload(getDefaultClaudeProjectsPath());
      await this.view.webview.postMessage({ type: 'reportData', payload });
    } catch (error) {
      await this.view.webview.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.isRefreshing = false;
    }
  }
}
```

- [ ] **步骤 3：监听 Webview 发来的消息**

在 `resolveWebviewView()` 中增加：

```js
webviewView.webview.onDidReceiveMessage(async (message) => {
  if (message?.type === 'ready' || message?.type === 'refresh') {
    await this.refresh();
  }
});
```

- [ ] **步骤 4：让 Webview 页面完全改成消息驱动**

把 `media/view.js` 的启动逻辑改成这种思路：

```js
let currentWindowKey = 'all';
let payload = null;

function requestRefresh() {
  vscode.postMessage({ type: 'refresh' });
}

document.querySelector('[data-action="refresh"]').addEventListener('click', () => {
  requestRefresh();
});
```

- [ ] **步骤 5：运行 Payload 相关测试**

运行命令：

```bash
node --test tests/report-payload.test.js tests/usage-aggregator.test.js
```

预期结果：

- Payload 组装测试通过
- 聚合逻辑测试继续通过

- [ ] **步骤 6：手动验证 Webview 是否展示真实数据**

操作方式：

- 按 `F5`

预期结果：

- 打开 `CC Usage` 后会读取 `~/.claude/projects` 中的真实数据
- 点击刷新按钮后，数据会重新加载

- [ ] **步骤 7：提交这一阶段改动**

```bash
git add src/webview/usage-view-provider.js media/view.js tests/report-payload.test.js
git commit -m "feat: load real usage data inside the vscode sidebar"
```

---

### 任务 6：补自动刷新、错误状态和刷新安全控制

**涉及文件：**
- 修改：`C:\Users\Cap\Desktop\cc-usage\src\webview\usage-view-provider.js`
- 修改：`C:\Users\Cap\Desktop\cc-usage\media\view.js`

- [ ] **步骤 1：给 Provider 加上定时器生命周期管理**

扩展 `UsageViewProvider`：

```js
class UsageViewProvider {
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
    this.view = null;
    this.isRefreshing = false;
    this.refreshTimer = null;
  }

  startAutoRefresh() {
    this.stopAutoRefresh();
    this.refreshTimer = setInterval(() => {
      void this.refresh();
    }, 120000);
  }

  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
```

- [ ] **步骤 2：在视图创建后启动自动刷新，在销毁时清理定时器**

在 `resolveWebviewView()` 中加入：

```js
this.startAutoRefresh();

webviewView.onDidDispose(() => {
  this.stopAutoRefresh();
  this.view = null;
});
```

- [ ] **步骤 3：增强目录不存在和空数据时的错误提示**

先加一个目录检查工具：

```js
const fs = require('node:fs/promises');

async function ensureReadableDirectory(dir) {
  const stat = await fs.stat(dir);
  if (!stat.isDirectory()) {
    throw new Error('未找到 Claude Code 日志目录');
  }
}
```

然后在 `refresh()` 中这样使用：

```js
const sourceDir = getDefaultClaudeProjectsPath();
await ensureReadableDirectory(sourceDir);
const payload = await buildReportPayload(sourceDir);
if (payload.report.summary.resultCount === 0) {
  throw new Error('没有找到可聚合的用量记录');
}
```

- [ ] **步骤 4：让页面明确体现加载中和错误状态**

在 `media/view.js` 中补这一类逻辑：

```js
function setRefreshing(isRefreshing) {
  const refreshButton = document.querySelector('[data-action="refresh"]');
  refreshButton.disabled = isRefreshing;
}

function showError(message) {
  setRefreshing(false);
  const empty = document.getElementById('empty');
  empty.hidden = false;
  empty.textContent = message;
  setMeta('Load failed');
}
```

- [ ] **步骤 5：手动验证自动刷新和错误状态**

人工检查项：

- 打开面板后等待 2 分钟
- 确认不点按钮也会自动刷新
- 临时把默认目录辅助函数改到一个错误目录
- 确认页面会显示清晰错误信息

- [ ] **步骤 6：提交这一阶段改动**

```bash
git add src/webview/usage-view-provider.js media/view.js
git commit -m "feat: add auto refresh and error handling to the sidebar"
```

---

### 任务 7：补文档和开发说明

**涉及文件：**
- 修改：`C:\Users\Cap\Desktop\cc-usage\README.md`

- [ ] **步骤 1：在 README 中加入 VS Code 插件开发说明**

文档里要同时保留两种模式，但插件模式放前面。例如：

```md
## VS Code 插件开发

1. 用 VS Code 打开本仓库
2. 按 `F5`
3. 在新打开的 Extension Development Host 窗口里点击 Activity Bar 中的 `CC Usage`
4. 侧边栏会读取 `~/.claude/projects`，并每 2 分钟自动刷新一次

## 旧版浏览器模式

```bash
node server.js
```
```

- [ ] **步骤 2：补一个给新手看的结构说明**

在 README 里增加：

```md
- `src/core/`：可复用的日志聚合核心
- `src/webview/`：VS Code 侧边栏视图接入层
- `media/`：侧边栏页面的静态资源
```

- [ ] **步骤 3：在文档和最终接线完成后跑完整测试**

运行命令：

```bash
node --test tests/*.test.js
```

预期结果：

- 所有单元测试通过

- [ ] **步骤 4：做最后一轮完整手工验证**

人工检查清单：

- 按 `F5` 能打开 Extension Development Host
- 侧边栏图标出现
- 面板能加载数据
- `All / 30d / 7d` 可以切换
- 手动刷新可用
- 2 分钟自动刷新可用

- [ ] **步骤 5：提交文档更新**

```bash
git add README.md
git commit -m "docs: add vscode plugin development guide"
```

---

## 三、需求覆盖检查

- PRD 要求“有侧边栏入口”：任务 1、任务 3 覆盖。
- PRD 要求“默认读取 `~/.claude/projects`”：任务 2、任务 5、任务 6 覆盖。
- PRD 要求“展示仪表盘”：任务 4、任务 5 覆盖。
- PRD 要求“支持手动刷新”：任务 3、任务 5 覆盖。
- PRD 要求“支持 2 分钟自动刷新”：任务 6 覆盖。
- PRD 要求“有错误提示”：任务 6 覆盖。
- PRD 要求“本地开发可调试”：任务 1、任务 7 覆盖。

## 四、自检说明

- 这份计划里没有保留 `TODO`、`TBD` 这种占位词。
- 任务顺序按“先脚手架，再核心重组，再视图接入，再数据接入，再刷新和错误处理，最后补文档”来组织，适合首版最小可行实现。
- 首版没有引入 TypeScript、打包器升级、Marketplace 发布流程，也没有把范围扩展到多 IDE，避免偏离已经确认的 PRD。

## 五、执行交接

实施计划已经写入 `docs/implementation-plan-vscode-plugin.md`。

接下来有两种执行方式：

**1. 子智能体分任务执行（推荐）**

- 每个任务单独派发一个执行单元
- 我在任务之间做检查和衔接
- 更适合步骤多、需要持续验证的改造

**2. 当前会话内联执行**

- 继续在这个会话里按顺序直接实现
- 适合你希望我现在就开始编码

如果你确认计划没问题，我建议下一步直接进入实现。你只需要告诉我一句：`按计划开始做`。 
