const net = require('net');
const { sendResponse } = require('../http/responseBuilder');

function forwardToUpstream(target, requestData, clientSocket, onDone) {
  const upstreamSocket = net.connect(target.port, target.host, () => {
    upstreamSocket.write(requestData);
  });

  upstreamSocket.on('data', (chunk) => {
    clientSocket.write(chunk);
  });

  upstreamSocket.on('close', () => {
    onDone();
  });

  upstreamSocket.on('error', (err) => {
    console.error(`[proxy] upstream ${target.host}:${target.port} error:`, err.message);
    sendResponse(clientSocket, 502, 'text/plain', 'Bad Gateway');
    onDone();
  });
}

module.exports = { forwardToUpstream };
