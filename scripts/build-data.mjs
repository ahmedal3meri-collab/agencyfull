#!/usr/bin/env node
// Builds app/data/index.json (agent catalogue) and app/version.js (cache stamp).
// Zero dependencies. Run: node scripts/build-data.mjs
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const agentsDir = join(root, 'agents');
const appDir = join(root, 'app');

function walk(dir) {
  return readdirSync(dir).sort().flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i < 1 || /^\s/.test(line)) continue;
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  return { meta, body: text.slice(m[0].length) };
}

const titleCase = (s) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const agents = [];
for (const file of walk(agentsDir).filter((f) => f.endsWith('.md'))) {
  const rel = relative(agentsDir, file).split('\\').join('/');
  const id = rel.replace(/\.md$/, '');
  const text = readFileSync(file, 'utf8');
  const { meta, body } = parseFrontmatter(text);
  const heading = /^#\s+(.+)$/m.exec(body);
  const firstPara = body.split(/\r?\n\s*\r?\n/).map((s) => s.trim()).find((s) => s && !/^[#>|`-]/.test(s));
  const entry = {
    id,
    cat: id.split('/')[0],
    name: meta.name || (heading ? heading[1].replace(/[*_`]/g, '').trim() : titleCase(id.split('/').pop())),
    desc: (meta.description || firstPara || '').replace(/\s+/g, ' ').replace(/[*_`]/g, '').slice(0, 260),
  };
  if (meta.emoji) entry.emoji = meta.emoji;
  if (meta.color) entry.color = meta.color;
  if (meta.vibe) entry.vibe = meta.vibe;
  if (!meta.name) entry.doc = true; // playbooks / runbooks, not personas
  agents.push(entry);
}

mkdirSync(join(appDir, 'data'), { recursive: true });
writeFileSync(join(appDir, 'data', 'index.json'), JSON.stringify({ agents }));

// Version = hash of everything the service worker caches.
const hash = createHash('sha256');
for (const f of [...walk(appDir), ...walk(agentsDir)]) {
  if (f.endsWith('version.js')) continue;
  hash.update(relative(root, f)).update(readFileSync(f));
}
const version = hash.digest('hex').slice(0, 10);
writeFileSync(join(appDir, 'version.js'), `self.APP_VERSION = '${version}';\n`);

console.log(`✓ ${agents.length} agents indexed · version ${version}`);
