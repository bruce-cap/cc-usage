const test = require('node:test');
const assert = require('node:assert/strict');

const pkg = require('../package.json');

test('package.json 暴露了 VS Code 扩展入口', () => {
  assert.equal(pkg.main, './src/extension.js');
  assert.ok(pkg.engines?.vscode);
});

test('package.json 将侧边栏视图声明为 webview 类型', () => {
  const view = pkg.contributes?.views?.ccUsage?.find((item) => item.id === 'ccUsage.sidebarView');
  assert.ok(view);
  assert.equal(view.type, 'webview');
});
