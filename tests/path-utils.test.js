const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');

const { resolveHomePath, getDefaultClaudeProjectsPath } = require('../src/core/path-utils.js');

test('resolveHomePath 可以展开波浪线路径', () => {
  assert.equal(resolveHomePath('~/.claude/projects'), path.join(os.homedir(), '.claude', 'projects'));
});

test('getDefaultClaudeProjectsPath 返回 Claude 默认日志目录', () => {
  assert.equal(getDefaultClaudeProjectsPath(), path.join(os.homedir(), '.claude', 'projects'));
});
