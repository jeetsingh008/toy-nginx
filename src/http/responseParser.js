// responseParser.js
// Parses a raw HTTP response (status line + headers + body) coming back
// from an upstream server, so the proxy can inspect/cache/modify it before
// relaying to the client, instead of blindly piping raw bytes through.

function parseResponse(raw) {
  const headerEndIndex = raw.indexOf('\r\n\r\n');
  const headerSection = headerEndIndex === -1 ? raw.toString() : raw.slice(0, headerEndIndex).toString();
  const body = headerEndIndex === -1 ? Buffer.alloc(0) : raw.slice(headerEndIndex + 4);

  const lines = headerSection.split('\r\n');
  const statusLine = lines[0]; // e.g. "HTTP/1.1 200 OK"
  const statusCode = parseInt(statusLine.split(' ')[1], 10);

  const headers = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();
    headers[key] = value;
  }

  return { statusCode, headers, body };
}

module.exports = { parseResponse };