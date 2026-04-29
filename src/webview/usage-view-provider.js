const fs = require('node:fs/promises');

const { buildReportPayload } = require('../core/report-payload.js');
const { getDefaultClaudeProjectsPath } = require('../core/path-utils.js');
const USAGE_VIEW_TYPE = 'ccUsage.sidebarView';
const { getWebviewHtml } = require('./webview-template.js');

async function ensureReadableDirectory(dir) {
  try {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) {
      throw new Error('未找到 Claude Code 日志目录');
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        throw new Error('未找到 Claude Code 日志目录');
      }
    }
    throw error;
  }
}

class UsageViewProvider {
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
    this.view = null;
    this.isRefreshing = false;
    this.refreshTimer = null;
  }

  resolveWebviewView(webviewView) {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    webviewView.webview.html = getWebviewHtml(webviewView.webview, this.extensionUri);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message?.type === 'ready' || message?.type === 'refresh') {
        await this.refresh();
      }
    });

    this.startAutoRefresh();

    webviewView.onDidDispose(() => {
      this.stopAutoRefresh();
      this.view = null;
    });
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

  async refresh() {
    if (!this.view || this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;
    this.view.webview.postMessage({ type: 'loading' });

    try {
      const sourceDir = getDefaultClaudeProjectsPath();
      await ensureReadableDirectory(sourceDir);
      const payload = await buildReportPayload(sourceDir);

      if (payload.report.summary.resultCount === 0) {
        throw new Error('没有找到可聚合的用量记录');
      }

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

module.exports = {
  UsageViewProvider,
  USAGE_VIEW_TYPE,
};
