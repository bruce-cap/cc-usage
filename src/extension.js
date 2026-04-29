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
