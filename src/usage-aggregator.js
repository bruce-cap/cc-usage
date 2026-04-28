const fs = require('node:fs/promises');
const path = require('node:path');

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function collectJsonlFiles(rootDir) {
  const results = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        results.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return results.sort();
}

function createDayBucket(date) {
  return {
    date,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheReadInputTokens: 0,
    totalCacheCreationInputTokens: 0,
    totalCostUsd: 0,
    totalTokens: 0,
  };
}

function createModelBucket(model) {
  return {
    model,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    totalTokens: 0,
    costUsd: 0,
    share: 0,
  };
}

async function aggregateUsageFromFiles(files, options = {}) {
  const dailyBuckets = new Map();
  const modelBuckets = new Map();
  let resultCount = 0;
  const assistantMode = options.assistantMode || 'snapshot';

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    const latestAssistantEntries = assistantMode === 'final' ? new Map() : null;

    for (const line of lines) {
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        continue;
      }

      const date = normalizeDate(record.timestamp || record._audit_timestamp);
      if (!date) {
        continue;
      }

      let entries = null;

      if (record.type === 'result' && record.modelUsage) {
        entries = Object.entries(record.modelUsage).map(([model, usage]) => ({
          model,
          inputTokens: usage.inputTokens || 0,
          outputTokens: usage.outputTokens || 0,
          cacheReadInputTokens: usage.cacheReadInputTokens || 0,
          cacheCreationInputTokens: usage.cacheCreationInputTokens || 0,
          costUsd: usage.costUSD || 0,
        }));
      } else if (
        record.type === 'assistant' &&
        record.message?.model &&
        record.message?.usage &&
        record.message?.id
      ) {
        if (assistantMode === 'final') {
          latestAssistantEntries.set(record.message.id, {
            model: record.message.model,
            inputTokens: record.message.usage.input_tokens || 0,
            outputTokens: record.message.usage.output_tokens || 0,
            cacheReadInputTokens: record.message.usage.cache_read_input_tokens || 0,
            cacheCreationInputTokens: record.message.usage.cache_creation_input_tokens || 0,
            costUsd: 0,
            date,
          });
          continue;
        }

        entries = [{
          model: record.message.model,
          inputTokens: record.message.usage.input_tokens || 0,
          outputTokens: record.message.usage.output_tokens || 0,
          cacheReadInputTokens: record.message.usage.cache_read_input_tokens || 0,
          cacheCreationInputTokens: record.message.usage.cache_creation_input_tokens || 0,
          costUsd: 0,
        }];
      }

      if (!entries || entries.length === 0) {
        continue;
      }

      resultCount += 1;

      const dayBucket = dailyBuckets.get(date) || createDayBucket(date);
      dailyBuckets.set(date, dayBucket);

      for (const usage of entries) {
        const totalTokens = usage.inputTokens + usage.outputTokens;

        dayBucket.totalInputTokens += usage.inputTokens;
        dayBucket.totalOutputTokens += usage.outputTokens;
        dayBucket.totalCacheReadInputTokens += usage.cacheReadInputTokens;
        dayBucket.totalCacheCreationInputTokens += usage.cacheCreationInputTokens;
        dayBucket.totalCostUsd += usage.costUsd;
        dayBucket.totalTokens += totalTokens;

        const modelBucket = modelBuckets.get(usage.model) || createModelBucket(usage.model);
        modelBuckets.set(usage.model, modelBucket);
        modelBucket.inputTokens += usage.inputTokens;
        modelBucket.outputTokens += usage.outputTokens;
        modelBucket.cacheReadInputTokens += usage.cacheReadInputTokens;
        modelBucket.cacheCreationInputTokens += usage.cacheCreationInputTokens;
        modelBucket.totalTokens += totalTokens;
        modelBucket.costUsd += usage.costUsd;
      }
    }

    if (latestAssistantEntries) {
      for (const usage of latestAssistantEntries.values()) {
        resultCount += 1;

        const dayBucket = dailyBuckets.get(usage.date) || createDayBucket(usage.date);
        dailyBuckets.set(usage.date, dayBucket);
        const totalTokens = usage.inputTokens + usage.outputTokens;

        dayBucket.totalInputTokens += usage.inputTokens;
        dayBucket.totalOutputTokens += usage.outputTokens;
        dayBucket.totalCacheReadInputTokens += usage.cacheReadInputTokens;
        dayBucket.totalCacheCreationInputTokens += usage.cacheCreationInputTokens;
        dayBucket.totalCostUsd += usage.costUsd;
        dayBucket.totalTokens += totalTokens;

        const modelBucket = modelBuckets.get(usage.model) || createModelBucket(usage.model);
        modelBuckets.set(usage.model, modelBucket);
        modelBucket.inputTokens += usage.inputTokens;
        modelBucket.outputTokens += usage.outputTokens;
        modelBucket.cacheReadInputTokens += usage.cacheReadInputTokens;
        modelBucket.cacheCreationInputTokens += usage.cacheCreationInputTokens;
        modelBucket.totalTokens += totalTokens;
        modelBucket.costUsd += usage.costUsd;
      }
    }
  }

  const dailyTotals = [...dailyBuckets.values()]
    .map((item) => ({
      ...item,
      totalCostUsd: round(item.totalCostUsd, 6),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalTokens = dailyTotals.reduce((sum, item) => sum + item.totalTokens, 0);

  const models = [...modelBuckets.values()]
    .filter((item) => item.totalTokens > 0 || item.costUsd > 0)
    .map((item) => ({
      ...item,
      costUsd: round(item.costUsd, 6),
      share: totalTokens === 0 ? 0 : round(item.totalTokens / totalTokens, 4),
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens || a.model.localeCompare(b.model));

  return {
    dailyTotals,
    models,
    summary: {
      totalTokens,
      totalInputTokens: dailyTotals.reduce((sum, item) => sum + item.totalInputTokens, 0),
      totalOutputTokens: dailyTotals.reduce((sum, item) => sum + item.totalOutputTokens, 0),
      totalCostUsd: round(dailyTotals.reduce((sum, item) => sum + item.totalCostUsd, 0), 6),
      fileCount: files.length,
      resultCount,
    },
  };
}

function summarizeWindow(report, options) {
  const days = options?.days ?? null;
  const endDate = options?.endDate ?? normalizeDate(new Date().toISOString());
  if (!days) {
    return [...report.dailyTotals];
  }

  const end = new Date(`${endDate}T00:00:00.000Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));

  return report.dailyTotals.filter((item) => {
    const current = new Date(`${item.date}T00:00:00.000Z`);
    return current >= start && current <= end;
  });
}

module.exports = {
  aggregateUsageFromFiles,
  collectJsonlFiles,
  summarizeWindow,
};
