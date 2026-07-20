const net = require('net');

function forwardToUpstream(target, requestData, onComplete, onError) {
  const chunks = [];
  let settled = false; // guards against 'error' AND 'close' both firing for one failed connection

  const upstreamSocket = net.connect(target.port, target.host, () => {
    upstreamSocket.write(requestData);
  });

  upstreamSocket.on('data', (chunk) => {
    chunks.push(chunk);
  });

  upstreamSocket.on('close', () => {
    if (settled) return; // already handled via 'error' below
    settled = true;
    onComplete(Buffer.concat(chunks));
  });

  upstreamSocket.on('error', (err) => {
    if (settled) return;
    settled = true;
    console.error(`[proxy] upstream ${target.host}:${target.port} error:`, err.message);
    onError(err);
  });
}

module.exports = { forwardToUpstream };