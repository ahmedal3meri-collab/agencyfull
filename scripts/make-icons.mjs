#!/usr/bin/env node
// Renders app/icons/*.png from icon.svg. Needs Playwright (dev-only; the PNGs are committed).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright');
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'app', 'icons');
const svg = readFileSync(join(dir, 'icon.svg'), 'utf8');
const square = svg.replace('rx="112"', 'rx="0"'); // iOS and maskable icons get masked by the OS
const jobs = [
  ['icon-192.png', 192, svg, 1],
  ['icon-512.png', 512, svg, 1],
  ['apple-touch-icon.png', 180, square, 1],
  ['maskable-512.png', 512, square, 0.78],
];
const browser = await chromium.launch();
for (const [name, size, markup, scale] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<body style="margin:0;background:#0d0f1a;display:grid;place-items:center;height:100vh">
     <div style="width:${size}px;height:${size}px;transform:scale(${scale})">${markup}</div>`
  );
  await page.screenshot({ path: join(dir, name), omitBackground: scale === 1 && markup === svg });
  await page.close();
}
await browser.close();
console.log('✓ icons written');
