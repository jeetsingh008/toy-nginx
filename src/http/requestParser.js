// requestParser.js
// Parses raw HTTP/1.1 request text (headers section) into a structured object.
// Body handling: caller is responsible for buffering according to Content-Length
// before calling this — this function assumes headerSection + body are both present.

function parseRequest(raw) {
  const headerEndIndex = raw.indexOf('\r\n\r\n');
  const headerSection = headerEndIndex === -1 ? raw : raw.slice(0, headerEndIndex);
  const body = headerEndIndex === -1 ? '' : raw.slice(headerEndIndex + 4);

  const lines = headerSection.split('\r\n');
  const [method, requestPath, httpVersion] = lines[0].split(' ');

  const headers = {};
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();
    headers[key] = value;
  }

  return { method, path: requestPath, httpVersion, headers, body };
}

module.exports = { parseRequest };
