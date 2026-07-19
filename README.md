# mini-nginx

A reverse proxy, round-robin load balancer, and static file server — built from raw TCP sockets in Node.js, with no Express and no built-in `http` module. HTTP requests are parsed by hand, byte by byte, the same way a framework does it invisibly.

This project exists to answer one question concretely: **what is nginx actually doing?** Not through reading about it — by rebuilding its core architecture (accept connections → route by path → serve files or forward to a backend → load balance across backends) at a small, honest scale.

## What it actually does

- Listens on a single port and accepts raw TCP connections directly via `net`
- Parses HTTP/1.1 requests from raw bytes — method, path, headers, body — with no parsing library
- Serves static files from disk with correct `Content-Type`, path-traversal protection, and proper 404 handling
- Reverse-proxies requests matching `/api` to one of three backend servers
- Load-balances across those backends with round-robin selection
- Is entirely driven by a small nginx-style config file (`config/nginx-clone.conf`) — routes, ports, and upstreams are data, not hardcoded logic

## Architecture

```
                        ┌─────────────────────┐
   client  ──HTTP──▶       proxy (port 8080)  
                         reads nginx-clone.conf
                        └──────────┬───────────┘
                                   │
                    matches request path against
                    config's `location` blocks
                                   │
                ┌──────────────────┴───────────────────┐
                │                                      │
        location "/"  → root                location "/api" → proxy_pass
                │                                      │
                ▼                                      ▼
     serves files from public/           round-robin across upstream "backend":
     (path-traversal guarded,             ┌──────────┬──────────┬──────────┐
      correct MIME types)                 │ Server A │ Server B │ Server C │
                                          │  :9090   │  :9091   │  :9092   │
                                          └──────────┴──────────┴──────────┘
```

Routing is **longest-prefix match** on the request path, the same rule real nginx uses — `/api` beats `/` for a request to `/api/anything`.

## Project structure

```
mini-nginx/
├── src/
│   ├── index.js                # entry point — loads config, starts backends + proxy
│   ├── config/configParser.js  # parses nginx-clone.conf
│   ├── http/
│   │   ├── requestParser.js    # raw HTTP text → {method, path, headers, body}
│   │   └── responseBuilder.js  # shared response-writing logic
│   ├── static/
│   │   ├── staticServer.js     # file serving + path traversal protection
│   │   └── mimeTypes.js
│   ├── server/
│   │   ├── proxyServer.js      # main TCP listener + routing
│   │   ├── router.js           # longest-prefix location matching
│   │   └── backendServer.js    # in-process backend "app server"
│   └── proxy/
│       ├── loadBalancer.js     # round-robin upstream selection
│       └── reverseProxy.js     # forwards raw request, relays raw response
├── config/nginx-clone.conf     # port, upstreams, location routing — all config-driven
├── public/                     # static site served by location "/"
├── scripts/benchmark.js        # dependency-free concurrent load tester
└── package.json
```

## Running it locally

```bash
npm install    # no dependencies currently, but keeps this future-proof
npm start
```

This starts:
- Three backend servers on ports `9090`, `9091`, `9092` (defined by `config/nginx-clone.conf`'s `upstream backend` block)
- The proxy on port `8080` (or `PORT` env var if set, for cloud hosting)

Then:

```bash
curl http://localhost:8080/          # served by the static file handler
curl -I http://localhost:8080/api    # forwarded to a backend — check X-Served-By header
```

Reload `/api` a few times and watch `X-Served-By` rotate: `Server A → Server B → Server C → Server A …`

## Benchmark results

Run with `npm run benchmark -- <url> <totalRequests> <concurrency>`. These are real results from running this project's own `scripts/benchmark.js` (500 requests, concurrency 50):

| Target | Requests/sec | Avg latency | p95 latency | Failures |
|---|---|---|---|---|
| Single backend directly (`:9090`) | 976.6 | 34.9 ms | 75 ms | 0/500 |
| Through the load-balanced proxy (`:8080`) | 1171.0 | 29.6 ms | 46 ms | 0/500 |

The proxy is faster under load than hitting one backend directly — because the same request volume is spread across three separate listeners instead of queueing behind one. That's the entire point of a load balancer made visible in numbers, not just architecture diagrams.

*(One real bug this project surfaced during benchmarking: early runs showed ~40% request failures under concurrency, all `ECONNRESET`. Root cause — the server always closes the connection after one response but never declared `Connection: close`, so HTTP/1.1 clients assumed keep-alive was available and got reset instead of a clean close. Fixed by explicitly sending that header. Left in this README because "found and fixed a real concurrency bug via load testing" is a more honest and more useful thing to be able to say than a benchmark table with no story behind it.)*

## Deployment notes

This deploys to any Node-friendly host (Render, Railway, Fly.io) with no changes beyond what's already handled:

- The proxy binds to `process.env.PORT` if set, falling back to the config file's port for local runs
- **Simplification for single-host deployment:** the three backend servers run in-process (multiple `net.createServer()` calls inside one Node process) rather than as genuinely separate machines or containers, which is what a production nginx setup would front. This keeps the whole thing deployable on a single free-tier instance while still exercising real, independent TCP listeners being load-balanced across — the load balancing logic itself doesn't know or care that they share a process.

To deploy on Render (or similar):
1. Push this repo to GitHub
2. Create a new Web Service, connect the repo
3. Build command: `npm install` — Start command: `npm start`
4. Render injects `PORT` automatically — no config changes needed

## What's deliberately out of scope

- **Concurrency mechanism**: Node's event loop (via libuv) already provides non-blocking I/O under the hood — this project doesn't rebuild an event loop, it demonstrates *why* one matters (see the companion blocking-vs-nonblocking experiment in the original build notes) and then relies on Node's own model rather than reimplementing epoll
- **HTTPS/TLS, HTTP/2, caching, rate limiting** — real nginx features not attempted here; this is intentionally scoped to the core routing/proxy/balance loop
- **Config validation** — a malformed `nginx-clone.conf` currently throws an unhandled error rather than a clean message; a good next contribution

## Why this project exists

Built to understand — concretely, not abstractly — what a reverse proxy and load balancer actually do underneath frameworks like nginx, and to prove that understanding by benchmarking a real bug into existence and fixing it, not just getting the demo to run once.
