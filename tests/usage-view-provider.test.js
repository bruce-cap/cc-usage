const test = require('node:test');
const assert = require('node:assert/strict');

const { UsageViewProvider, USAGE_VIEW_TYPE } = require('../src/webview/usage-view-provider.js');

test('usage view provider 暴露了正确的视图类型和构造函数', () => {
  assert.equal(USAGE_VIEW_TYPE, 'ccUsage.sidebarView');
  assert.equal(typeof UsageViewProvider, 'function');
});
