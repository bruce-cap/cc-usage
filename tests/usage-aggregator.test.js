const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const {
  aggregateUsageFromFiles,
  summarizeWindow,
} = require('../src/usage-aggregator.js');

test('aggregateUsageFromFiles groups result records by day and model', async () => {
  const fixture = path.join(__dirname, 'fixtures', 'sample-session.jsonl');

  const report = await aggregateUsageFromFiles([fixture]);

  assert.deepEqual(report.dailyTotals, [
    {
      date: '2026-04-26',
      totalInputTokens: 1600,
      totalOutputTokens: 300,
      totalCacheReadInputTokens: 300,
      totalCacheCreationInputTokens: 50,
      totalCostUsd: 0.7,
      totalTokens: 1900,
    },
    {
      date: '2026-04-27',
      totalInputTokens: 400,
      totalOutputTokens: 50,
      totalCacheReadInputTokens: 20,
      totalCacheCreationInputTokens: 0,
      totalCostUsd: 0.12,
      totalTokens: 450,
    },
    {
      date: '2026-04-28',
      totalInputTokens: 200,
      totalOutputTokens: 40,
      totalCacheReadInputTokens: 10,
      totalCacheCreationInputTokens: 0,
      totalCostUsd: 0,
      totalTokens: 240,
    },
  ]);

  assert.deepEqual(report.models, [
    {
      model: 'MiniMax-M2.7',
      inputTokens: 1400,
      outputTokens: 250,
      cacheReadInputTokens: 320,
      cacheCreationInputTokens: 50,
      totalTokens: 1650,
      costUsd: 0.62,
      share: 0.6371,
    },
    {
      model: 'gpt-5.4',
      inputTokens: 600,
      outputTokens: 100,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0,
      totalTokens: 700,
      costUsd: 0.2,
      share: 0.2703,
    },
    {
      model: 'claude-sonnet-4-6',
      inputTokens: 200,
      outputTokens: 40,
      cacheReadInputTokens: 10,
      cacheCreationInputTokens: 0,
      totalTokens: 240,
      costUsd: 0,
      share: 0.0927,
    },
  ]);

  assert.equal(report.summary.totalTokens, 2590);
  assert.equal(report.summary.fileCount, 1);
  assert.equal(report.summary.resultCount, 5);
});

test('summarizeWindow filters to recent days', () => {
  const report = {
    dailyTotals: [
      { date: '2026-04-20', totalTokens: 100 },
      { date: '2026-04-26', totalTokens: 300 },
      { date: '2026-04-27', totalTokens: 450 },
      { date: '2026-04-28', totalTokens: 50 },
    ],
  };

  const recent = summarizeWindow(report, {
    endDate: '2026-04-28',
    days: 3,
  });

  assert.deepEqual(recent.map((item) => item.date), [
    '2026-04-26',
    '2026-04-27',
    '2026-04-28',
  ]);
});

test('aggregateUsageFromFiles can keep the last usage snapshot for duplicate assistant message ids', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'token-watch-'));
  const fixture = path.join(tempDir, 'duplicate-assistant.jsonl');

  try {
    await fs.writeFile(
      fixture,
      [
        JSON.stringify({
          type: 'assistant',
          timestamp: '2026-04-28T05:53:06.894Z',
          message: {
            id: 'resp_duplicate',
            model: 'gpt-5.4',
            usage: {
              input_tokens: 0,
              output_tokens: 0,
              cache_read_input_tokens: 0,
              cache_creation_input_tokens: 0,
            },
          },
        }),
        JSON.stringify({
          type: 'assistant',
          timestamp: '2026-04-28T05:53:07.894Z',
          message: {
            id: 'resp_duplicate',
            model: 'gpt-5.4',
            usage: {
              input_tokens: 22448,
              output_tokens: 435,
              cache_read_input_tokens: 14080,
              cache_creation_input_tokens: 0,
            },
          },
        }),
      ].join('\n'),
      'utf8',
    );

    const report = await aggregateUsageFromFiles([fixture], {
      assistantMode: 'final',
    });

    assert.deepEqual(report.dailyTotals, [
      {
        date: '2026-04-28',
        totalInputTokens: 22448,
        totalOutputTokens: 435,
        totalCacheReadInputTokens: 14080,
        totalCacheCreationInputTokens: 0,
        totalCostUsd: 0,
        totalTokens: 22883,
      },
    ]);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test('aggregateUsageFromFiles counts duplicate assistant snapshots in desktop-compatible mode', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'token-watch-'));
  const fixture = path.join(tempDir, 'duplicate-assistant.jsonl');

  try {
    await fs.writeFile(
      fixture,
      [
        JSON.stringify({
          type: 'assistant',
          timestamp: '2026-04-28T05:53:06.894Z',
          message: {
            id: 'resp_duplicate',
            model: 'gpt-5.4',
            usage: {
              input_tokens: 100,
              output_tokens: 10,
              cache_read_input_tokens: 0,
              cache_creation_input_tokens: 0,
            },
          },
        }),
        JSON.stringify({
          type: 'assistant',
          timestamp: '2026-04-28T05:53:07.894Z',
          message: {
            id: 'resp_duplicate',
            model: 'gpt-5.4',
            usage: {
              input_tokens: 22448,
              output_tokens: 435,
              cache_read_input_tokens: 14080,
              cache_creation_input_tokens: 0,
            },
          },
        }),
      ].join('\n'),
      'utf8',
    );

    const report = await aggregateUsageFromFiles([fixture]);

    assert.deepEqual(report.dailyTotals, [
      {
        date: '2026-04-28',
        totalInputTokens: 22548,
        totalOutputTokens: 445,
        totalCacheReadInputTokens: 14080,
        totalCacheCreationInputTokens: 0,
        totalCostUsd: 0,
        totalTokens: 22993,
      },
    ]);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
