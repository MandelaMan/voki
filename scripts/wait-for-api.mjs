import http from 'node:http';

const url = process.env.API_HEALTH_URL || 'http://127.0.0.1:3001/health';
const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS || 120_000);
const intervalMs = Number(process.env.WAIT_INTERVAL_MS || 500);
const started = Date.now();

function check() {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(Boolean(res.statusCode && res.statusCode < 500));
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2_000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

while (Date.now() - started < timeoutMs) {
  if (await check()) {
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}

console.error(`Timed out waiting for API health at ${url}`);
process.exit(1);
