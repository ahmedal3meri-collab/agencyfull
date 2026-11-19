#!/usr/bin/env node
// Zero-dependency local server for the Agency PWA.
//   node server.mjs            → http://localhost:4173 (and your LAN IP)
//   PORT=8080 node server.mjs
// Serves ONLY app/ and agents/ — never .env or anything else in the repo.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { networkInterfaces } from 'node:os';
import { join, normalize, extname, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const APP = join(root, 'app');
const AGENTS = join(root, 'agents');
const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function resolvePath(urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath); } catch { return null; }
  if (p.includes('\0')) return null;
  const [base, rest] = p.startsWith('/agents/') ? [AGENTS, p.slice('/agents'.length)] : [APP, p];
  const full = normalize(join(base, rest));
  if (full !== base && !full.startsWith(base + sep)) return null; // path traversal
  if (base === AGENTS && extname(full) !== '.md') return null;
  return full;
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }
  const { pathname } = new URL(req.url, 'http://x');
  let file = resolvePath(pathname === '/' ? '/index.html' : pathname);
  try {
    if (!file) throw new Error('forbidden');
    if ((await stat(file)).isDirectory()) throw new Error('dir');
    let body = await readFile(file);
    const type = TYPES[extname(file)] || 'application/octet-stream';
    const headers = {
      'Content-Type': type,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    };
    if (/gzip/.test(req.headers['accept-encoding'] || '') && !type.startsWith('image/png')) {
      body = gzipSync(body);
      headers['Content-Encoding'] = 'gzip';
    }
    headers['Content-Length'] = body.length;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  Agency PWA شغّال ✓\n`);
  console.log(`  على هذا الجهاز:   http://localhost:${PORT}`);
  for (const list of Object.values(networkInterfaces())) {
    for (const ni of list || []) {
      if (ni.family === 'IPv4' && !ni.internal) console.log(`  على الشبكة:       http://${ni.address}:${PORT}`);
    }
  }
  console.log(`\n  للآيفون (تثبيت كتطبيق + بدون نت) يلزم HTTPS — شوف README.\n  Ctrl+C للإيقاف.\n`);
});
