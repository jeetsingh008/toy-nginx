// cache.js
// A minimal in-memory, TTL-based cache — the same idea as nginx's
// proxy_cache. Keyed by "METHOD path", storing the parsed upstream
// response so it can be replayed without hitting the backend again
// until it expires.

function createCache() {
  const store = new Map(); // key -> { value, expiresAt }

  function makeKey(method, path) {
    return `${method} ${path}`;
  }

  function get(method, path) {
    const key = makeKey(method, path);
    const entry = store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.value;
  }

  function set(method, path, value, ttlSeconds) {
    const key = makeKey(method, path);
    store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  return { get, set };
}

module.exports = { createCache };