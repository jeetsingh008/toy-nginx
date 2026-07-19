// responseBuilder.js
// Shared response-writing logic so every server (static, backend, proxy)
// constructs HTTP responses the same way.

const STATUS_TEXT = {
  200: 'OK',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
};

function sendResponse(socket, statusCode, contentType, body, extraHeaders = {}) {
  const statusText = STATUS_TEXT[statusCode] || 'Unknown';
  const bodyBuffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body));

  const headerLines = [
    `HTTP/1.1 ${statusCode} ${statusText}`,
    `Content-Type: ${contentType}`,
    `Content-Length: ${bodyBuffer.length}`,
    // We always close the socket after one response (no keep-alive support
    // yet), so we must say so explicitly — HTTP/1.1 defaults to persistent
    // connections, and clients that assume keep-alive is available will see
    // an ECONNRESET instead of a clean close if we don't declare this.
    `Connection: close`,
    ...Object.entries(extraHeaders).map(([k, v]) => `${k}: ${v}`),
  ];

  socket.write(headerLines.join('\r\n') + '\r\n\r\n');
  socket.write(bodyBuffer);
  socket.end();
}

module.exports = { sendResponse };
