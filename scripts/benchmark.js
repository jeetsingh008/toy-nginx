const http = require('http');

const [, , url, totalArg, concurrencyArg] = process.argv;
const total = parseInt(totalArg || '200', 10);
const concurrency = parseInt(concurrencyArg || '20', 10);

if (!url) {
  console.error('Usage: node scripts/benchmark.js <url> <totalRequests> <concurrency>');
  process.exit(1);
}

function makeRequest() {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get(url, (res) => {
      res.on('data', () => {});
      res.on('end', () => resolve({ ok: true, ms: Date.now() - start, status: res.statusCode }));
    });
    req.on('error', () => resolve({ ok: false, ms: Date.now() - start }));
  });
}

async function runBatch(count) {
  const promises = [];
  for (let i = 0; i < count; i++) promises.push(makeRequest());
  return Promise.all(promises);
}

async function main() {
  console.log(`Benchmarking ${url}`);
  console.log(`Total requests: ${total}, concurrency: ${concurrency}\n`);

  const results = [];
  const overallStart = Date.now();

  let remaining = total;
  while (remaining > 0) {
    const batchSize = Math.min(concurrency, remaining);
    const batchResults = await runBatch(batchSize);
    results.push(...batchResults);
    remaining -= batchSize;
  }

  const overallMs = Date.now() - overallStart;
  const successful = results.filter((r) => r.ok);
  const failed = results.length - successful.length;
  const latencies = successful.map((r) => r.ms).sort((a, b) => a - b);
  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];
  const rps = (successful.length / overallMs) * 1000;

  console.log(`Total time:        ${overallMs} ms`);
  console.log(`Successful:        ${successful.length}/${results.length} (${failed} failed)`);
  console.log(`Requests/sec:      ${rps.toFixed(1)}`);
  console.log(`Avg latency:       ${avg.toFixed(1)} ms`);
  console.log(`p50 latency:       ${p50} ms`);
  console.log(`p95 latency:       ${p95} ms`);
  console.log(`p99 latency:       ${p99} ms`);
}

main();
