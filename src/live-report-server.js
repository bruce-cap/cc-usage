const fs = require('node:fs/promises');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const { buildReportPayload } = require('./report-payload.js');

function resolveHomePath(input) {
  if (!input) {
    return input;
  }

  if (input.startsWith('~/')) {
    return path.join(os.homedir(), input.slice(2));
  }

  return input;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendText(response, statusCode, contentType, body) {
  response.writeHead(statusCode, {
    'content-type': contentType,
    'cache-control': 'no-store',
  });
  response.end(body);
}

function createLiveReportServer(options = {}) {
  const sourceDir = path.resolve(
    resolveHomePath(options.sourceDir) || path.join(os.homedir(), '.claude', 'projects'),
  );
  const publicDir = path.resolve(options.publicDir || path.join(process.cwd(), 'public'));

  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');

      if (request.method === 'GET' && url.pathname === '/api/report') {
        const payload = await buildReportPayload(sourceDir);
        sendJson(response, 200, payload);
        return;
      }

      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        const html = await fs.readFile(path.join(publicDir, 'index.html'), 'utf8');
        sendText(response, 200, 'text/html; charset=utf-8', html);
        return;
      }

      sendJson(response, 404, {
        error: 'Not found',
      });
    } catch (error) {
      sendJson(response, 500, {
        error: error.message,
      });
    }
  });
}

module.exports = {
  createLiveReportServer,
  resolveHomePath,
};
