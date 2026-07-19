// index.js — entry point
//
// 1. Loads and parses config/nginx-clone.conf
// 2. Starts one in-process backend server per upstream entry in the config
// 3. Starts the proxy, which routes requests to static files or backends
//    based on the config's `location` blocks
//
// Run with: node src/index.js

const path = require('path');
const { parseConfig } = require('./config/configParser');
const { startBackendServer } = require('./server/backendServer');
const { startProxyServer } = require('./server/proxyServer');
const { createLoadBalancer } = require('./proxy/loadBalancer');

const ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'nginx-clone.conf');

const config = parseConfig(CONFIG_PATH);

// Cloud hosts (Render, Railway, Fly.io, etc.) inject the port to bind via
// process.env.PORT — fall back to the config file's port for local runs.
const listenPort = process.env.PORT ? parseInt(process.env.PORT, 10) : config.port;

console.log('[startup] loaded config:', JSON.stringify(config, null, 2));

// Start one backend per server listed in every upstream group.
// Backends serve the same public/ directory a real app server would.
let backendLabelCounter = 0;
const backendLabels = ['Server A', 'Server B', 'Server C', 'Server D', 'Server E'];

Object.values(config.upstreams).forEach((servers) => {
  servers.forEach((server) => {
    const label = backendLabels[backendLabelCounter++] || `Server ${backendLabelCounter}`;
    startBackendServer({
      port: server.port,
      label,
      rootDir: path.join(ROOT, 'public'),
    });
  });
});

const loadBalancer = createLoadBalancer(config.upstreams);

startProxyServer({
  port: listenPort,
  config,
  loadBalancer,
  rootPath: ROOT,
});
