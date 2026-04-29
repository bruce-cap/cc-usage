const os = require('node:os');
const path = require('node:path');

function resolveHomePath(input) {
  if (!input) {
    return input;
  }

  if (input.startsWith('~/')) {
    return path.join(os.homedir(), input.slice(2));
  }

  return input;
}

function getDefaultClaudeProjectsPath() {
  return path.join(os.homedir(), '.claude', 'projects');
}

module.exports = {
  getDefaultClaudeProjectsPath,
  resolveHomePath,
};
