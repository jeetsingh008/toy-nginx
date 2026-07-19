const net = require('net');
const { parseRequest } = require('../http/requestParser');
const { serveStatic } = require('../static/staticServer');

function startBackendServer({ port, label, rootDir }) {
  const server = net.createServer((socket) => {
    let buffered = '';

    socket.on('data', (chunk) => {
      buffered += chunk.toString();
      if (!buffered.includes('\r\n\r\n')) return;

      const request = parseRequest(buffered);
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
