// proxyServer.js
// The main entry point's TCP server: buffers incoming requests one at a
// time per connection, routes each to either static file serving or
// reverse-proxying to an upstream, based on the loaded config.

const net = require('net');
const { parseRequest } = require('../http/requestParser');
const { sendResponse } = require('../http/responseBuilder');
const { serveStatic } = require('../static/staticServer');
const { forwardToUpstream } = require('../proxy/reverseProxy');
const { matchLocation } = require('./router');

function startProxyServer({ port, config, loadBalancer, rootPath }) {
  const proxy = net.createServer((clientSocket) => {
    let clientBuffered = '';
    let busy = false;

    const forwardNextRequest = () => {
      if (busy) return;

      const headerEnd = clientBuffered.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;

      const requestData = clientBuffered.slice(0, headerEnd + 4);
      clientBuffered = clientBuffered.slice(headerEnd + 4);
      busy = true;

      const request = parseRequest(requestData);
      const location = matchLocation(config.locations, request.path);

      if (!location) {
        sendResponse(clientSocket, 404, 'text/plain', 'No matching location');
        busy = false;
        return;
      }

      if (location.proxyPass) {
        const target = loadBalancer.pickUpstream(location.proxyPass);
        if (!target) {
          sendResponse(clientSocket, 502, 'text/plain', 'No upstream available');
          busy = false;
          return;
        }
        forwardToUpstream(target, requestData, clientSocket, () => {
          busy = false;
          forwardNextRequest();
        });
      } else if (location.root) {
        serveStatic(path_join(rootPath, location.root), request, clientSocket);
        busy = false;
        forwardNextRequest();
      } else {
        sendResponse(clientSocket, 500, 'text/plain', 'Location has no root or proxy_pass');
        busy = false;
      }
    };

    clientSocket.on('data', (chunk) => {
      clientBuffered += chunk.toString();
      forwardNextRequest();
    });

    clientSocket.on('error', (err) => {
      console.error('[proxy] client socket error:', err.message);
    });
  });

  proxy.listen(port, () => {
    console.log(`[proxy] listening on port ${port}`);
  });

  return proxy;
}

// Small local helper to avoid importing `path` into two places awkwardly
function path_join(base, rel) {
  return require('path').resolve(base, rel);
}

module.exports = { startProxyServer };
