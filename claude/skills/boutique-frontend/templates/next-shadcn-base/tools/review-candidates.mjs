#!/usr/bin/env node
// review-candidates.mjs
// Generates a static HTML contact sheet for _raw/candidates/ that shows
// each candidate PNG alongside its prompt sidecar. No server. Just opens
// the file in your default browser.
//
// Usage: node tools/review-candidates.mjs

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { exec } from "node:child_process";

const DIR = "_raw/candidates";
const OUT = join(DIR, "index.html");

if (!existsSync(DIR)) {
  console.error(`No ${DIR}/ directory.`);
  process.exit(1);
}

const pngs = readdirSync(DIR)
  .filter((f) => f.toLowerCase().endsWith(".png"))
  .map((f) => {
    const sidecarPath = join(DIR, basename(f, extname(f)) + ".json");
    let prompt = "(no sidecar)";
    let model = "?";
    let aspect = "?";
    if (existsSync(sidecarPath)) {
      try {
        const sc = JSON.parse(readFileSync(sidecarPath, "utf8"));
        prompt = sc.prompt || "(no prompt in sidecar)";
        model = sc.model || "?";
        aspect = sc.aspect_ratio || "?";
      } catch { /* ignore */ }
    }
    return { file: f, prompt, model, aspect };
  });

const cells = pngs.map((p) => `
  <figure>
    <img src="${p.file}" loading="lazy" alt="">
    <figcaption>
      <code>${p.file}</code>
      <small>${p.model} | aspect ${p.aspect}</small>
      <p>${escapeHtml(p.prompt)}</p>
    </figcaption>
  </figure>
`).join("");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Candidates review</title>
<style>
  body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; background: #0d0d0d; color: #eee; }
  header { padding: 16px 24px; background: #1a1a1a; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; padding: 16px; }
  figure { margin: 0; background: #1a1a1a; padding: 12px; border-radius: 6px; }
  figure img { width: 100%; height: auto; display: block; border-radius: 4px; }
  figcaption { font-size: 13px; margin-top: 8px; }
  figcaption code { color: #ffb86b; }
  figcaption small { color: #888; display: block; margin-top: 4px; }
  figcaption p { margin: 8px 0 0; line-height: 1.45; }
</style>
</head>
<body>
<header><strong>Candidates:</strong> ${pngs.length} in ${DIR}</header>
<section class="grid">${cells}</section>
</body>
</html>`;

writeFileSync(OUT, html);
console.log(`Wrote ${OUT} (${pngs.length} candidates)`);
console.log("Opening in default browser...");
exec(`start "" "${OUT.replace(/\//g, "\\")}"`);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
