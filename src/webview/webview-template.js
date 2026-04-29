function createNonce() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getWebviewHtml(webview, extensionUri) {
  const vscode = require('vscode');
  const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'view.css'));
  const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'view.js'));
  const nonce = createNonce();

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="${cssUri}" />
    <title>CC Usage</title>
  </head>
  <body>
    <main class="page">
      <h1>近期模型用量概览</h1>
      <div id="sub" class="sub">准备读取本地 Claude Code 会话日志</div>
      <section class="panel">
        <div class="toolbar">
          <div class="toolbar-main">
            <div class="buttons">
              <button data-window="all" class="active">All</button>
              <button data-window="days30">30d</button>
              <button data-window="days7">7d</button>
            </div>
            <button data-action="refresh" class="secondary">刷新</button>
          </div>
          <div id="meta" class="meta"></div>
        </div>
        <div id="metrics" class="metrics"></div>
        <div id="chart" class="chart"></div>
        <div id="models" class="models"></div>
        <div id="empty" class="empty" hidden>没有找到可聚合的用量记录。</div>
      </section>
    </main>
    <script nonce="${nonce}" src="${jsUri}"></script>
  </body>
</html>`;
}

module.exports = {
  getWebviewHtml,
};
