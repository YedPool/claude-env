#!/usr/bin/env node
// dedup-imported.mjs
// Rewrites local Button/Card/etc imports inside components/_imported/ to point
// at the canonical @/components/ui/<name>. After this pass, deleted any orphan
// primitives the generator dumped alongside its component.
//
// Usage: pnpm run dedup:imported

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, unlinkSync } from "node:fs";
import { join, basename, extname } from "node:path";

const ROOT = "components/_imported";

const CANONICAL = new Set([
  "button", "input", "card", "dialog", "badge", "label", "separator",
  "avatar", "tooltip", "dropdown-menu", "tabs", "select", "checkbox",
  "radio-group", "sheet", "popover", "scroll-area", "skeleton", "toast",
  "alert", "alert-dialog", "accordion", "calendar", "command", "form",
  "hover-card", "menubar", "navigation-menu", "progress", "switch",
  "table", "textarea", "toggle",
]);

if (!existsSync(ROOT)) {
  console.log(`No ${ROOT}/ directory; nothing to dedup.`);
  process.exit(0);
}

// Rewrite imports of local files that look like canonical primitives.
// Matches ./button, ./folder/button, ../button, ../../ui/button etc.
// NOT bare package names (react) or already-canonical @/... paths.
const RELATIVE_IMPORT_RE = /from\s+["'](?:\.{1,2}\/(?:[^"']*\/)?)([a-z-]+)["']/g;

function walk(dir, fileVisitor) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, fileVisitor);
    else fileVisitor(p);
  }
}

let rewrites = 0;
walk(ROOT, (path) => {
  if (!/\.tsx?$/.test(path)) return;
  let src = readFileSync(path, "utf8");
  const before = src;
  src = src.replace(RELATIVE_IMPORT_RE, (m, name) => {
    if (CANONICAL.has(name)) { rewrites++; return `from "@/components/ui/${name}"`; }
    return m;
  });
  if (src !== before) writeFileSync(path, src, "utf8");
});

// Prune orphan primitives the generator dropped alongside its component.
let pruned = 0;
walk(ROOT, (path) => {
  const name = basename(path, extname(path)).toLowerCase();
  if (CANONICAL.has(name)) {
    unlinkSync(path);
    pruned++;
  }
});

console.log(`Dedup complete. Rewrites: ${rewrites}. Pruned: ${pruned} orphan primitives.`);
console.log(`Promote (move out of _imported/) when ready.`);
