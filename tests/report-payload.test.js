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
