const path = require('node:path');

const { createLiveReportServer } = require('./src/legacy/live-report-server.js');
const { getDefaultClaudeProjectsPath, resolveHomePath } = require('./src/core/path-utils.js');

const port = Number(process.env.PORT || process.argv[2] || 3000);
const sourceDir = resolveHomePath(process.argv[3]) || getDefaultClaudeProjectsPath();

const server = createLiveReportServer({
  sourceDir,
  publicDir: path.join(__dirname, 'public'),
});

server.listen(port, '127.0.0.1', () => {
  console.log(`cc-usage listening on http://127.0.0.1:${port}`);
  console.log(`Reading live data from ${path.resolve(sourceDir)}`);
});
