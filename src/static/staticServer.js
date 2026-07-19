// staticServer.js
// Serves files from a given root directory, with path traversal protection.

const fs = require('fs');
const path = require('path');
const { getMimeType } = require('./mimeTypes');
const { sendResponse } = require('../http/responseBuilder');

function serveStatic(rootDir, request, socket, extraHeaders = {}) {
  const publicDir = path.resolve(rootDir);
  const requestedPath = request.path === '/' ? '/index.html' : request.path;
  const resolvedPath = path.resolve(path.join(publicDir, requestedPath));

  // Path traversal guard: resolved path must stay inside publicDir
  if (!resolvedPath.startsWith(publicDir)) {
    return sendResponse(socket, 403, 'text/plain', 'Forbidden', extraHeaders);
  }

  fs.readFile(resolvedPath, (err, data) => {
    if (err) {
      return sendResponse(socket, 404, 'text/plain', 'Not Found', extraHeaders);
    }
    sendResponse(socket, 200, getMimeType(resolvedPath), data, extraHeaders);
  });
}

module.exports = { serveStatic };
