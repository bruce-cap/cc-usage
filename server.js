const path = require('node:path');

const { createLiveReportServer, resolveHomePath } = require('./src/live-report-server.js');

const port = Number(process.env.PORT || process.argv[2] || 3000);
const sourceDir = resolveHomePath(process.argv[3]) || path.join(require('node:os').homedir(), '.claude', 'projects');

const server = createLiveReportServer({
  sourceDir,
  publicDir: path.join(__dirname, 'public'),
});

server.listen(port, '127.0.0.1', () => {
  console.log(`cc-usage listening on http://127.0.0.1:${port}`);
  console.log(`Reading live data from ${path.resolve(sourceDir)}`);
});
