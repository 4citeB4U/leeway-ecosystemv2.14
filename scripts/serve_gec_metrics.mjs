import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.GEC_METRICS_PORT || 8777);
const METRICS_PATH = path.join(process.cwd(), 'agent-lee-coding-mode', 'Archive', 'receipts', 'gec_metrics.json');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/metrics') {
    if (!fs.existsSync(METRICS_PATH)) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'metrics not found' }));
      return;
    }
    const raw = fs.readFileSync(METRICS_PATH, 'utf8');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(raw);
    return;
  }
  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'not found' }));
});

server.listen(PORT, () => {
  console.log(`GEC metrics server listening on http://localhost:${PORT}/metrics`);
});
