#!/usr/bin/env node
// optimize-asset.mjs
// Nano Banana Pro 4K source -> AVIF + WebP variants at 5 widths + 20px LQIP blur.
//
// Usage:
//   node tools/optimize-asset.mjs <raw.png> <basename>
//
// Example:
//   node tools/optimize-asset.mjs _raw/2026-06-03_hero-landing-desktop-v1.png hero-landing-16x9-light

import sharp from "sharp";
import { promises as fs } from "node:fs";
import path from "node:path";

const WIDTHS = [640, 960, 1280, 1920, 2560];
const AVIF = { quality: 60, effort: 4, chromaSubsampling: "4:2:0" };
const WEBP = { quality: 80, effort: 6 };
const OUT_DIR = "public/assets";
const BLUR_INDEX = path.join(OUT_DIR, "_blur.json");

async function main() {
  const [, , src, basename] = process.argv;
  if (!src || !basename) {
    console.error("usage: optimize-asset.mjs <raw.png> <basename>");
    process.exit(1);
  }
  await fs.mkdir(OUT_DIR, { recursive: true });

  const img = sharp(src, { limitInputPixels: false }).rotate();
  const meta = await img.metadata();
  console.log(`source: ${meta.width}x${meta.height}`);

  for (const w of WIDTHS) {
    if (w > meta.width) continue; // never upscale
    const base = path.join(OUT_DIR, `${basename}-w${w}`);
    await img.clone().resize({ width: w }).avif(AVIF).toFile(`${base}.avif`);
    await img.clone().resize({ width: w }).webp(WEBP).toFile(`${base}.webp`);
    console.log(`  -> ${base}.{avif,webp}`);
  }

  // 20px LQIP for placeholder=blur
  const lqip = await img.clone()
    .resize({ width: 20 })
    .webp({ quality: 40 })
    .toBuffer();
  const dataUrl = `data:image/webp;base64,${lqip.toString("base64")}`;

  let index = {};
  try { index = JSON.parse(await fs.readFile(BLUR_INDEX, "utf8")); } catch {}
  index[basename] = { blurDataURL: dataUrl, width: meta.width, height: meta.height };
  await fs.writeFile(BLUR_INDEX, JSON.stringify(index, null, 2));
  console.log(`  -> blur index updated`);
}
main().catch((e) => { console.error(e); process.exit(1); });
