const vscode = acquireVsCodeApi();

let currentWindowKey = 'all';
let currentPayload = null;

const numberFmt = new Intl.NumberFormat('en-US');
const percentFmt = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const moneyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function compactNumber(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value);
}

function setMeta(text) {
  document.getElementById('meta').textContent = text;
}

function setSubtext(text) {
  document.getElementById('sub').textContent = text;
}

function setRefreshing(isRefreshing) {
  const refreshButton = document.querySelector('[data-action="refresh"]');
  refreshButton.disabled = isRefreshing;
}

function showEmpty(message) {
  const empty = document.getElementById('empty');
  empty.hidden = false;
  empty.textContent = message;
  document.getElementById('chart').hidden = true;
  document.getElementById('models').hidden = true;
  document.getElementById('metrics').hidden = true;
}

function clearEmpty() {
  const empty = document.getElementById('empty');
  empty.hidden = true;
  document.getElementById('chart').hidden = false;
  document.getElementById('models').hidden = false;
  document.getElementById('metrics').hidden = false;
}

function renderMetrics(daily) {
  const totalTokens = daily.reduce((sum, item) => sum + item.totalTokens, 0);
  const totalInputTokens = daily.reduce((sum, item) => sum + item.totalInputTokens, 0);
  const totalOutputTokens = daily.reduce((sum, item) => sum + item.totalOutputTokens, 0);
  const totalCostUsd = daily.reduce((sum, item) => sum + item.totalCostUsd, 0);
  const metrics = [
    ['总 Token', compactNumber(totalTokens)],
    ['输入', compactNumber(totalInputTokens)],
    ['输出', compactNumber(totalOutputTokens)],
    ['成本', moneyFmt.format(totalCostUsd)],
  ];

  document.getElementById('metrics').innerHTML = metrics
    .map(
      ([label, value]) => `
        <div class="metric">
          <div class="label">${label}</div>
          <div class="value">${value}</div>
        </div>
      `,
    )
    .join('');
}

function renderChart(daily) {
  const chart = document.getElementById('chart');
  const max = Math.max(...daily.map((item) => item.totalTokens), 0);
  chart.innerHTML = daily
    .map((item) => {
      const height = max === 0 ? 4 : Math.max(4, Math.round((item.totalTokens / max) * 170));
      return `
        <div class="bar-wrap" title="${item.date} ${numberFmt.format(item.totalTokens)} tokens">
          <div class="bar-value">${compactNumber(item.totalTokens)}</div>
          <div class="bar" style="height:${height}px"></div>
          <div class="bar-label">${item.date.slice(5)}</div>
        </div>
      `;
    })
    .join('');
}

function renderModels(report) {
  document.getElementById('models').innerHTML = report.models
    .map(
      (item) => `
        <div class="model-row">
          <div class="model-name">${item.model}</div>
          <div class="model-stats">
            ${compactNumber(item.inputTokens)} in ·
            ${compactNumber(item.outputTokens)} out
          </div>
          <div class="model-share">${percentFmt.format(item.share)}</div>
        </div>
      `,
    )
    .join('');
}

function render(payload, windowKey) {
  const daily = payload.windows[windowKey] || [];
  setRefreshing(false);
  setSubtext(`实时读取 ${payload.sourceDir} 的本地会话日志`);

  if (daily.length === 0) {
    showEmpty('没有找到可聚合的用量记录。');
    return;
  }

  clearEmpty();
  renderMetrics(daily);
  renderChart(daily);
  renderModels(payload.report);
  setMeta(
    `Generated ${new Date(payload.generatedAt).toLocaleString()} · ${payload.report.summary.fileCount} files`,
  );
}

function showError(message) {
  setRefreshing(false);
  showEmpty(message);
  setMeta('Load failed');
}

function requestRefresh() {
  setRefreshing(true);
  setMeta('Refreshing...');
  vscode.postMessage({ type: 'refresh' });
}

window.addEventListener('message', (event) => {
  const message = event.data;

  if (message.type === 'loading') {
    setRefreshing(true);
    setMeta('Refreshing...');
    return;
  }

  if (message.type === 'reportData') {
    currentPayload = message.payload;
    render(currentPayload, currentWindowKey);
    return;
  }

  if (message.type === 'error') {
    showError(message.message);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-window]').forEach((button) => {
    button.addEventListener('click', () => {
      currentWindowKey = button.dataset.window;
      document.querySelectorAll('[data-window]').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      if (currentPayload) {
        render(currentPayload, currentWindowKey);
      }
    });
  });

  document.querySelector('[data-action="refresh"]').addEventListener('click', () => {
    requestRefresh();
  });

  vscode.postMessage({ type: 'ready' });
});
