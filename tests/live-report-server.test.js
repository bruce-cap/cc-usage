const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createLiveReportServer } = require('../src/legacy/live-report-server.js');

async function withTempFixtureDir(run) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'cc-usage-'));
  const sourceDir = path.join(tempRoot, 'projects');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.copyFile(
    path.join(__dirname, 'fixtures', 'sample-session.jsonl'),
    path.join(sourceDir, 'session.jsonl'),
  );

  try {
    await run({ tempRoot, sourceDir });
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

test('GET /api/report returns a fresh aggregated payload for the configured source directory', async () => {
  await withTempFixtureDir(async ({ sourceDir }) => {
    const server = createLiveReportServer({
      sourceDir,
      publicDir: path.join(process.cwd(), 'public'),
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/report`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8');

      const payload = await response.json();
      assert.equal(payload.sourceDir, sourceDir);
      assert.equal(payload.report.summary.fileCount, 1);
      assert.equal(payload.report.summary.totalTokens, 2590);
      assert.deepEqual(payload.windows.days7.map((item) => item.date), [
        '2026-04-26',
        '2026-04-27',
        '2026-04-28',
      ]);
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
});

test('GET / serves the dashboard html instead of a prebuilt dist artifact', async () => {
  await withTempFixtureDir(async ({ sourceDir }) => {
    const server = createLiveReportServer({
      sourceDir,
      publicDir: path.join(process.cwd(), 'public'),
    });

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();

    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');

      const html = await response.text();
      assert.match(html, /近期模型用量概览/);
      assert.match(html, /data-action="refresh"/);
      assert.doesNotMatch(html, /__REPORT_JSON__/);
    } finally {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  });
});
