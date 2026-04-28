const path = require('node:path');

const {
  aggregateUsageFromFiles,
  collectJsonlFiles,
  summarizeWindow,
} = require('./usage-aggregator.js');

function buildWindows(report) {
  const lastDate = report.dailyTotals.at(-1)?.date ?? null;

  return {
    all: report.dailyTotals,
    days30: lastDate ? summarizeWindow(report, { endDate: lastDate, days: 30 }) : [],
    days7: lastDate ? summarizeWindow(report, { endDate: lastDate, days: 7 }) : [],
  };
}

async function buildReportPayload(sourceDir) {
  const resolvedSourceDir = path.resolve(sourceDir);
  const files = await collectJsonlFiles(resolvedSourceDir);
  const report = await aggregateUsageFromFiles(files, {
    assistantMode: 'snapshot',
  });

  return {
    generatedAt: new Date().toISOString(),
    sourceDir: resolvedSourceDir,
    report,
    windows: buildWindows(report),
  };
}

module.exports = {
  buildReportPayload,
};
