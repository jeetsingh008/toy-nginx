const net = require('net');
const { parseRequest } = require('../http/requestParser');
const { serveStatic } = require('../static/staticServer');
const { sendResponse } = require('../http/responseBuilder');

function startBackendServer({ port, label, rootDir }) {
  const server = net.createServer((socket) => {
    let buffered = '';

    socket.on('data', (chunk) => {
      buffered += chunk.toString();
      if (!buffered.includes('\r\n\r\n')) return;

      const request = parseRequest(buffered);
      if (request.path.startsWith('/api')) {
        const payload = JSON.stringify({
          status: 'success',
          message: `Hello from ${label}! Reverse proxy and round-robin load balancing are working.`,
          server: label,
          path: request.path,
          timestamp: new Date().toISOString(),
        });
        return sendResponse(socket, 200, 'application/json', payload, { 'X-Served-By': label });
      }

      serveStatic(rootDir, request, socket, { 'X-Served-By': label });
    });

    socket.on('error', () => {
      // Ignore abrupt client disconnects on the backend side
    });
  });

  server.listen(port, () => {
    console.log(`[backend] ${label} listening on port ${port}`);
  });

  return server;
}

module.exports = { startBackendServer };
