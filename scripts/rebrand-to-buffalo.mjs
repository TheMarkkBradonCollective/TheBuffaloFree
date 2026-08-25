#!/usr/bin/env node
/**
 * One-time rebrand: TheBuffaloFree → TheBuffaloFree
 */
import { readFileSync, writeFileSync, readdirSync, statSync, renameSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.html', '.css', '.md', '.sql',
  '.xml', '.gradle', '.properties', '.txt', '.example', '.sh', '.py', '.java',
  '.rules', '.svg',
]);

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'play-store-assets/screenshots']);

const REPLACEMENTS = [
  ['TheBuffaloFree', 'TheBuffaloFree'],
  ['BuffaloBuyNothing', 'BuffaloBuyNothing'],
  ['Buffalo Buy Nothing', 'Buffalo Buy Nothing'],
  ['buffalo-buy-nothing', 'buffalo-buy-nothing'],
  ['org.buffalobuynothing.app', 'org.buffalobuynothing.app'],
  ['buffalobuynothing.com', 'buffalobuynothing.com'],
  ['support@buffalobuynothing.org', 'support@buffalobuynothing.org'],
  ['buffalobuynothing.org', 'buffalobuynothing.org'],
  ['neighbor@buffalobuynothing.org', 'neighbor@buffalobuynothing.org'],
  ['BuffaloMapView', 'BuffaloMapView'],
  ['BUFFALO_NEIGHBORHOODS', 'BUFFALO_NEIGHBORHOODS'],
  ['BUFFALO_SERVICE_AREA', 'BUFFALO_SERVICE_AREA'],
  ['isLatLngInBuffaloServiceArea', 'isLatLngInBuffaloServiceArea'],
  ['isRouteInBuffaloServiceArea', 'isRouteInBuffaloServiceArea'],
  ['isInBuffaloServiceArea', 'isInBuffaloServiceArea'],
  ['r/BuffaloBuyNothing', 'r/BuffaloBuyNothing'],
  ['Buffalo Neighbor', 'Buffalo Neighbor'],
  ['Buffalo area', 'Buffalo area'],
  ['Buffalo neighborhoods', 'Buffalo neighborhoods'],
  ['Buffalo Neighborhood Map', 'Buffalo Neighborhood Map'],
  ['Buffalo metro', 'Buffalo metro'],
  ['Buffalo blue', 'Buffalo blue'],
  ['Buffalo', 'Buffalo'],
  ['Buffalo', 'Buffalo'],
  ['buf-buynothing', 'buf-buynothing'],
  ['TBF_', 'TBF_'],
  ['tbf_', 'tbf_'],
  ['tbf-', 'tbf-'],
  ['--tbf-', '--tbf-'],
  ['tbf-smoke', 'tbf-smoke'],
];

const COLOR_REPLACEMENTS = [
  ['#00338D', '#00338D'],
  ['#00338d', '#00338d'],
  ['#002A72', '#002A72'],
  ['#002a72', '#002a72'],
  ['#0047AB', '#0047AB'],
  ['#0047ab', '#0047ab'],
  ['#E6EEF7', '#E6EEF7'],
  ['#e6eef7', '#e6eef7'],
  ['#f0f4fa', '#f0f4fa'],
  ['#ccd9eb', '#ccd9eb'],
  ['#9fb8d9', '#9fb8d9'],
  ['#5d8fbf', '#5d8fbf'],
  ['#5D8FBF', '#5D8FBF'],
  ['#002868', '#002868'],
  ['#002152', '#002152'],
  ['#001a42', '#001a42'],
  ['#001430', '#001430'],
  ['rgba(0, 51, 141,', 'rgba(0, 51, 141,'],
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function applyReplacements(content) {
  let out = content;
  for (const [from, to] of REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  for (const [from, to] of COLOR_REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  return out;
}

const files = walk(root);
let changed = 0;

for (const file of files) {
  const ext = extname(file);
  if (!TEXT_EXTENSIONS.has(ext) && !file.endsWith('.env.example')) continue;
  const before = readFileSync(file, 'utf8');
  const after = applyReplacements(before);
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}

// Rename map component file
const oldMap = join(root, 'src/components/BuffaloMapView.tsx');
const newMap = join(root, 'src/components/BuffaloMapView.tsx');
try {
  renameSync(oldMap, newMap);
  console.log('Renamed BuffaloMapView.tsx → BuffaloMapView.tsx');
} catch {
  // already renamed
}

// Rename Android Java package directory
const oldJava = join(root, 'android/app/src/main/java/org/sacramentobuynothing');
const newJava = join(root, 'android/app/src/main/java/org/buffalobuynothing');
try {
  const { mkdirSync, cpSync, rmSync } = await import('node:fs');
  if (statSync(oldJava).isDirectory()) {
    mkdirSync(join(newJava, 'app'), { recursive: true });
    cpSync(join(oldJava, 'app'), join(newJava, 'app'), { recursive: true });
    rmSync(oldJava, { recursive: true, force: true });
    console.log('Moved Android Java package to org.buffalobuynothing');
  }
} catch {
  // path may already be updated
}

console.log(`Rebrand complete — ${changed} files updated.`);
