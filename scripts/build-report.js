const fs = require('node:fs/promises');
const path = require('node:path');

const { buildReportPayload } = require('../src/core/report-payload.js');
const { getDefaultClaudeProjectsPath, resolveHomePath } = require('../src/core/path-utils.js');

async function main() {
  const sourceDir = resolveHomePath(process.argv[2]) || getDefaultClaudeProjectsPath();
  const outputDir = process.argv[3]
    ? path.resolve(process.argv[3])
    : path.join(process.cwd(), 'dist');

  const payload = await buildReportPayload(sourceDir);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, 'report.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8',
  );

  const htmlTemplate = await fs.readFile(path.join(process.cwd(), 'public', 'index.html'), 'utf8');
  const html = htmlTemplate.replace(
    '"__REPORT_JSON__"',
    JSON.stringify(payload),
  );
  await fs.writeFile(path.join(outputDir, 'index.html'), html, 'utf8');

  console.log(`Scanned ${payload.report.summary.fileCount} files from ${payload.sourceDir}`);
  console.log(`Wrote ${path.join(outputDir, 'report.json')}`);
  console.log(`Wrote ${path.join(outputDir, 'index.html')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
