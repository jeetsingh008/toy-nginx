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
    `Connection: close`,
    ...Object.entries(extraHeaders).map(([k, v]) => `${k}: ${v}`),
  ];

  socket.write(headerLines.join('\r\n') + '\r\n\r\n');
  socket.write(bodyBuffer);
  socket.end();
}

module.exports = { sendResponse };
