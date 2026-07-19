
const fs = require('fs');

function parseConfig(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const config = {
    port: 8080,
    upstreams: {}, // { backend: [{host, port}, ...] }
    locations: [], // [{ path, root }] or [{ path, proxyPass }]
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('port ')) {
      config.port = parseInt(line.split(' ')[1], 10);
      i++;
      continue;
    }

    if (line.startsWith('upstream ')) {
      const name = line.split(' ')[1];
      const servers = [];
      i++;
      while (lines[i] !== '}') {
        if (i >= lines.length) throw new Error(`Config error: unclosed "upstream ${name}" block`);
        const [, address] = lines[i].split(' ');
        const [host, port] = address.split(':');
        servers.push({ host, port: parseInt(port, 10) });
        i++;
      }
      config.upstreams[name] = servers;
      i++;
      continue;
    }

    if (line.startsWith('location ')) {
      const locPath = line.split(' ')[1];
      const block = {};
      i++;
      while (lines[i] !== '}') {
        if (i >= lines.length) throw new Error(`Config error: unclosed "location ${locPath}" block`);
        const [key, value] = lines[i].split(' ');
        if (key === 'root') block.root = value;
        if (key === 'proxy_pass') block.proxyPass = value;
        i++;
      }
      config.locations.push({ path: locPath, ...block });
      i++;
      continue;
    }

    i++; // skip unrecognized lines
  }

  return config;
}

module.exports = { parseConfig };
