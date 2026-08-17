import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'public', 'signage');
const port = Number(process.env.SIGNAGE_PORT || 8765);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
};

createServer((req, res) => {
  const raw = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = join(root, raw === '/' ? 'wbgt-cube-sasakikensetu-4face.html' : raw.replace(/^\//, ''));
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }
  if (!existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found: ' + raw);
    return;
  }
  const ext = extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(readFileSync(filePath));
}).listen(port, () => {
  console.log(`Signage static server: http://localhost:${port}/`);
  console.log(`  4面 ECS: http://localhost:${port}/wbgt-cube-sasakikensetu-4face.html`);
});
