#!/usr/bin/env node
// normalize-imported.mjs
// Scans components/_imported/ for generator output and rewrites hardcoded
// hex colors and font-family strings to CSS variables. Anything ambiguous
// gets a FLAG entry in .normalize-warnings.json for manual review.
//
// Usage: pnpm run normalize:imported  (or `node scripts/normalize-imported.mjs`)

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "components/_imported";
const WARNINGS = [];

if (!existsSync(ROOT)) {
  console.log(`No ${ROOT}/ directory; nothing to normalize.`);
  process.exit(0);
}

// Hex/rgb -> token mappings considered safe to auto-rewrite. Anything else
// gets a FLAG entry.
const COLOR_MAP = {
  "#ffffff": "var(--background)",
  "#fff": "var(--background)",
  "#000000": "var(--foreground)",
  "#000": "var(--foreground)",
  "#f3f4f6": "var(--muted)",
  "#e5e7eb": "var(--border)",
  "#6b7280": "var(--muted-foreground)",
  "#111827": "var(--foreground)",
  "#fafafa": "var(--background)",
  "#f9fafb": "var(--background)",
};

const FONT_REWRITES = [
  // CSS in plain stylesheets
  [/font-family:\s*['"]?Inter['"]?[^;]*/gi, "font-family: var(--font-sans)"],
  [/font-family:\s*['"]?Geist['"]?[^;]*/gi, "font-family: var(--font-sans)"],
  [/font-family:\s*['"]?Roboto['"]?[^;]*/gi, "font-family: var(--font-sans)"],
  // Tailwind arbitrary class form
  [/font-\[Inter\]/g, "font-sans"],
  [/font-\[Geist\]/g, "font-sans"],
  [/font-\[Roboto\]/g, "font-sans"],
  // JSX style object form: fontFamily: "Inter, ..." or fontFamily: 'Geist'
  [/fontFamily:\s*['"](?:Inter|Geist|Roboto|system-ui)[^'"]*['"]/g, 'fontFamily: "var(--font-sans)"'],
];

// Tailwind arbitrary CSS-var class form (some v0 output): font-[--font-foo]
// Convert generator's local --font-foo to canonical --font-sans.
const TW_ARBITRARY_FONT_VAR_RE = /font-\[--font-[a-z-]+\]/g;

const HEX_RE = /#(?:[0-9a-fA-F]{3}){1,2}\b/g;
const ARBITRARY_COLOR_RE = /\b(?:bg|text|border|ring|fill|stroke)-\[(#[0-9a-fA-F]{3,8})\]/g;
const DATA_THEME_DARK_RE = /\[data-theme=['"]dark['"]\]/g;

function walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(e)) processFile(p);
  }
}

function processFile(path) {
  let src = readFileSync(path, "utf8");
  const before = src;

  // 1. Hardcoded hex -> token (mapped) or FLAG (unmapped).
  src = src.replace(HEX_RE, (hex) => {
    const lower = hex.toLowerCase();
    if (COLOR_MAP[lower]) return COLOR_MAP[lower];
    WARNINGS.push({ path, kind: "unmapped-hex", value: hex });
    return hex;
  });

  // 2. Tailwind arbitrary color classes -> FLAG (manual decision needed).
  src.replace(ARBITRARY_COLOR_RE, (_, hex) => {
    WARNINGS.push({ path, kind: "arbitrary-tw-color", value: hex });
    return _;
  });

  // 3. Font-family rewrites.
  for (const [re, rep] of FONT_REWRITES) src = src.replace(re, rep);
  src = src.replace(TW_ARBITRARY_FONT_VAR_RE, "font-sans");

  // 4. Magic's [data-theme="dark"] -> shadcn's .dark
  src = src.replace(DATA_THEME_DARK_RE, ".dark");

  // 5. Pixel font-sizes outside Tailwind utility classes -> FLAG.
  const px = src.match(/font-size:\s*\d+px/g);
  if (px) WARNINGS.push({ path, kind: "px-font-size", count: px.length });

  if (src !== before) writeFileSync(path, src, "utf8");
}

walk(ROOT);
writeFileSync(".normalize-warnings.json", JSON.stringify(WARNINGS, null, 2));
console.log(`Normalized. Warnings: ${WARNINGS.length}`);
process.exit(WARNINGS.some((w) => w.kind === "arbitrary-tw-color") ? 1 : 0);
