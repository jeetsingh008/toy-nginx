# Case study: nginx-from-scratch

## The problem I set out to solve

As a MERN developer, I'd used nginx and Express constantly but had never actually built what either of them does underneath — request parsing, routing, reverse proxying, load balancing. I wanted to understand that layer concretely rather than just knowing the vocabulary, so I built a working (small-scale) version of it myself, in Node, using only raw TCP sockets — no Express, no `http` module.

## What I built

A reverse proxy and load balancer that:
- Parses raw HTTP/1.1 requests byte-by-byte, without any parsing library
- Serves static files with correct MIME types and path-traversal protection
- Routes requests to either static files or one of three backend servers, based on a small nginx-style config file I also wrote a parser for
- Load-balances across those backends with round-robin selection

It's fully config-driven — ports, routes, and backend addresses live in a config file, not hardcoded in the routing logic, the same separation real nginx makes between engine and configuration.

## A real bug I found and fixed via benchmarking

I wrote a small load-testing script to compare hitting one backend directly versus going through the load-balanced proxy. The first run showed roughly 40% of requests failing under concurrency — all `ECONNRESET`.

The cause: my server always closes the connection after sending one response, but never explicitly declared `Connection: close` in the response headers. HTTP/1.1 defaults to persistent connections, so clients were assuming a keep-alive connection was available and getting a reset instead of a clean close when the server closed anyway. Adding the missing header fixed it completely — 0 failures across 500 concurrent requests afterward.

I'm including this in the writeup deliberately: finding and fixing a real concurrency bug through load testing is a more honest signal of understanding than a clean benchmark table with no story behind it.

## Results

| Target | Requests/sec | Avg latency | Failures |
|---|---|---|---|
| Single backend directly | 976.6 | 34.9 ms | 0/500 |
| Through the load-balanced proxy | 1171.0 | 29.6 ms | 0/500 |

The load-balanced version handles the same request volume faster, because it's spreading load across three listeners instead of queuing behind one — the exact mechanism a load balancer exists to provide, made visible in numbers rather than just architecture diagrams.

## What this demonstrates

- Comfort working below framework abstractions — parsing protocols, managing raw sockets, handling partial/chunked data
- Real debugging under load, not just "it works on my machine"
- Understanding of core infrastructure concepts (reverse proxying, load balancing, config-driven routing) that transfer directly to backend and DevOps-adjacent work
- Following through a project to a deployed, working, benchmarked state — not just a tutorial-following demo

**Repo:** [link to GitHub repo]
**Live demo:** [link once deployed]
