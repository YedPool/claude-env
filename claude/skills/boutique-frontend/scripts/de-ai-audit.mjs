#!/usr/bin/env node
// de-ai-audit.mjs
// Audits a running web page against the 9 anti-tells in anti-tell-checklist.md.
// Auto-detects 7 of 9 tells + the 3 Lovable composite fingerprints.
// Harvests candidates for the 2 vision-only tells (fake-testimonials, stock-illustrations).
//
// Usage:
//   node de-ai-audit.mjs <url> [--out report.json] [--screenshot shot.png]
//
// Requires: npm i playwright (will install on first run if missing).

import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { argv, exit } from 'node:process';

const args = argv.slice(2);
if (args.length === 0) {
  console.error('usage: node de-ai-audit.mjs <url> [--out report.json] [--screenshot shot.png]');
  exit(2);
}
const url = args[0];
const outPath = (() => { const i = args.indexOf('--out'); return i >= 0 ? args[i + 1] : null; })();
const shotPath = (() => { const i = args.indexOf('--screenshot'); return i >= 0 ? args[i + 1] : null; })();

const FONT_BLOCKLIST = [
  /\binter\b/i,
  /\broboto\b/i,
  /\bsystem-ui\b/i,
  /-apple-system/i,
  /BlinkMacSystemFont/i,
  /"?Segoe UI"?/i,
  /"?Helvetica Neue"?/i,
  /\bArial\b/i,
  /\bsans-serif\b/i,
  /\bui-sans-serif\b/i,
  /"?Geist( Sans| Mono)?"?/i,
  /\bSF Pro( Display| Text)?\b/i,
];

async function runInPage(page) {
  return page.evaluate((blocklistSrc) => {
    const blocklist = blocklistSrc.map(s => new RegExp(s.source, s.flags));
    const firstFam = (ff) => (ff || '').split(',')[0].trim().replace(/^["']|["']$/g, '');

    // Tell 1: font
    const bodyFF = getComputedStyle(document.body).fontFamily;
    const h1 = document.querySelector('h1, h2');
    const headFF = h1 ? getComputedStyle(h1).fontFamily : bodyFF;
    const bodyFirst = firstFam(bodyFF);
    const headFirst = firstFam(headFF);
    const fontFail = blocklist.some(rx => rx.test(bodyFirst)) || blocklist.some(rx => rx.test(headFirst));

    // Tell 2: gradients
    const toHsl = (cssColor) => {
      const c = document.createElement('canvas'); c.width = c.height = 1;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = cssColor; ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      if (a < 10) return null;
      const R = r / 255, G = g / 255, B = b / 255;
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B); const d = mx - mn;
      let h = 0; const l = (mx + mn) / 2; const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      if (d !== 0) {
        if (mx === R) h = 60 * (((G - B) / d) % 6);
        else if (mx === G) h = 60 * (((B - R) / d) + 2);
        else h = 60 * (((R - G) / d) + 4);
      }
      if (h < 0) h += 360;
      return { h, s, l };
    };
    const gradients = [];
    const all = document.querySelectorAll('*');
    for (const el of all) {
      const bg = getComputedStyle(el).backgroundImage;
      if (!bg || bg === 'none') continue;
      if (!/gradient\(/i.test(bg)) continue;
      const colors = (bg.match(/(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))/gi) || []);
      if (colors.length < 2) continue;
      const hsl = colors.map(toHsl).filter(Boolean);
      if (hsl.length < 2) continue;
      const hueA = hsl[0].h, hueB = hsl[hsl.length - 1].h;
      const inRange = (h, lo, hi) => (lo <= hi) ? (h >= lo && h <= hi) : (h >= lo || h <= hi);
      const cyanViolet = (inRange(hueA, 170, 220) && inRange(hueB, 250, 290)) ||
        (inRange(hueB, 170, 220) && inRange(hueA, 250, 290));
      const pinkOrange = (inRange(hueA, 300, 350) && inRange(hueB, 10, 45)) ||
        (inRange(hueB, 300, 350) && inRange(hueA, 10, 45));
      gradients.push({
        selector: el.tagName.toLowerCase() + (el.id ? ('#' + el.id) : '') +
          (el.className && typeof el.className === 'string' ?
            ('.' + el.className.split(/\s+/).slice(0, 2).join('.')) : ''),
        colors, hues: hsl.map(x => Math.round(x.h)), cyanViolet, pinkOrange,
      });
    }
    const gradientFail = gradients.some(g => g.cyanViolet || g.pinkOrange);

    // Tell 3: 3-column feature grid
    const isFeatureCard = (el) => {
      const hasIcon = !!el.querySelector('svg, img');
      const hasHead = !!el.querySelector('h1,h2,h3,h4,h5,h6,[role=heading]');
      const paras = [...el.querySelectorAll('p')].filter(p => p.innerText.trim().length > 0);
      const shortCopy = paras.length <= 3 && paras.every(p => p.innerText.length < 280);
      return hasIcon && hasHead && shortCopy;
    };
    const threeColHits = [];
    const candidates = document.querySelectorAll('section, [class*="features"], [class*="grid"], main > div');
    for (const c of candidates) {
      const kids = [...c.children];
      for (let i = 0; i + 2 < kids.length; i++) {
        const trio = [kids[i], kids[i + 1], kids[i + 2]];
        if (!trio.every(isFeatureCard)) continue;
        const widths = trio.map(t => Math.round(t.getBoundingClientRect().width));
        const min = Math.min(...widths), max = Math.max(...widths);
        if (min === 0) continue;
        if ((max - min) / max < 0.08) {
          threeColHits.push({
            container: c.tagName.toLowerCase() + (c.id ? ('#' + c.id) : ''),
            widths,
          });
          break;
        }
      }
    }
    const featureGridFail = threeColHits.length > 0;

    // Tell 5: section rhythm
    const sections = [...document.querySelectorAll('section, main > div, [class*="section"]')]
      .filter(s => s.getBoundingClientRect().height > 200);
    const pads = sections.map(s => {
      const cs = getComputedStyle(s);
      return {
        pt: parseFloat(cs.paddingTop) || 0,
        pb: parseFloat(cs.paddingBottom) || 0,
        h: s.getBoundingClientRect().height,
      };
    });
    let rhythmFail = false, rhythmDetail = { n: pads.length };
    if (pads.length >= 4) {
      const verticals = pads.map(p => p.pt + p.pb);
      const mean = verticals.reduce((a, b) => a + b, 0) / verticals.length;
      const sd = Math.sqrt(verticals.reduce((a, b) => a + (b - mean) ** 2, 0) / verticals.length);
      const cv = mean === 0 ? 0 : sd / mean;
      rhythmDetail = { n: pads.length, meanVerticalPad: Math.round(mean), cv: +cv.toFixed(3) };
      rhythmFail = cv < 0.15;
    }

    // Tell 7: everything centered
    const sectionCenters = sections.map(s => {
      const cs = getComputedStyle(s);
      const txtCenter = cs.textAlign === 'center';
      const flexCenter = cs.display.includes('flex') && (cs.justifyContent === 'center' || cs.alignItems === 'center');
      const gridCenter = cs.display.includes('grid') && (cs.justifyItems === 'center' || cs.placeItems.includes('center'));
      const h = s.querySelector('h1,h2,h3,p');
      const inner = h ? getComputedStyle(h).textAlign === 'center' : false;
      return txtCenter || flexCenter || gridCenter || inner;
    });
    const centerRatio = sections.length ? sectionCenters.filter(Boolean).length / sections.length : 0;
    const centerFail = sections.length >= 3 && centerRatio >= 0.6;

    // Lovable L2: 3-tier pricing middle highlighted
    let pricingFail = false, pricingDetail = null;
    const priceish = [...document.querySelectorAll('*')].filter(el => {
      const t = el.innerText || '';
      return /\$\s?\d|\d+\s*\/(mo|month|yr|year)/i.test(t) && t.length < 400;
    });
    const priceParents = new Map();
    for (const el of priceish) {
      const p = el.parentElement; if (!p) continue;
      priceParents.set(p, (priceParents.get(p) || 0) + 1);
    }
    for (const [parent, count] of priceParents) {
      if (count !== 3) continue;
      const tiers = [...parent.children].filter(c => /\$\s?\d|\d+\s*\/(mo|month|yr|year)/i.test(c.innerText || ''));
      if (tiers.length !== 3) continue;
      const mid = tiers[1];
      const midCs = getComputedStyle(mid);
      const midTransform = midCs.transform;
      const midShadow = midCs.boxShadow;
      const midRing = (mid.className && /ring|border-2|border-primary|highlight|popular|featured|scale-/i.test(
        typeof mid.className === 'string' ? mid.className : ''));
      const hasScale = midTransform && /matrix.*?,\s*([0-9.]+)\s*,\s*0\s*,\s*0\s*,\s*([0-9.]+)/.test(midTransform);
      const distinguished = !!midRing || (midShadow && midShadow !== 'none') || hasScale;
      if (distinguished) { pricingFail = true; pricingDetail = { tiers: 3, midClass: mid.className }; break; }
    }

    // Lovable L3: "Made with Lovable" footer
    const bodyText = document.body.innerText.toLowerCase();
    const madeWithLovable = bodyText.includes('made with lovable') ||
      !!document.querySelector('a[href*="lovable.dev" i]');

    // Tells 4, 6 candidate harvest (for vision pass)
    const testimonialCandidates = [...document.querySelectorAll(
      'blockquote, [class*="testimonial" i], [class*="quote" i]')].slice(0, 20).map(el => ({
        text: (el.innerText || '').slice(0, 240),
        avatar: el.querySelector('img')?.src || null,
      }));
    const heroImages = [...document.querySelectorAll('main img, section img, header img')]
      .slice(0, 20).map(el => ({ src: el.src, alt: el.alt, w: el.naturalWidth, h: el.naturalHeight }));
    const heroSvgs = [...document.querySelectorAll('main svg, section svg, header svg')]
      .slice(0, 10).map(el => el.outerHTML.slice(0, 400));

    // Animation presence
    let animatedCount = 0;
    for (const el of all) {
      const cs = getComputedStyle(el);
      if (cs.animationName && cs.animationName !== 'none') animatedCount++;
      else if (cs.transitionProperty && cs.transitionProperty !== 'none' &&
        cs.transitionProperty !== 'all 0s ease 0s') {
        if (parseFloat(cs.transitionDuration) > 0) animatedCount++;
      }
    }
    const motionLibs = {
      framer: !!document.querySelector('[data-framer-name], [data-projection-id]'),
      gsap: !!window.gsap,
      lottie: !!document.querySelector('lottie-player, [class*="lottie" i]'),
    };

    return {
      font: { verdict: fontFail ? 'fail' : 'pass', bodyFamily: bodyFirst, headingFamily: headFirst },
      gradient: { verdict: gradientFail ? 'fail' : 'pass', hits: gradients.filter(g => g.cyanViolet || g.pinkOrange), totalGradients: gradients.length },
      feature_grid: { verdict: featureGridFail ? 'fail' : 'pass', hits: threeColHits },
      section_rhythm: { verdict: rhythmFail ? 'fail' : 'pass', ...rhythmDetail },
      centered: { verdict: centerFail ? 'fail' : 'pass', centerRatio: +centerRatio.toFixed(2), sectionCount: sections.length },
      lovable_pricing: { verdict: pricingFail ? 'fail' : 'pass', detail: pricingDetail },
      lovable_footer: { verdict: madeWithLovable ? 'fail' : 'pass' },
      _harvest: {
        testimonials: testimonialCandidates,
        hero_images: heroImages,
        hero_svgs: heroSvgs,
        animation: { animatedElementCount: animatedCount, libs: motionLibs },
      },
    };
  }, FONT_BLOCKLIST.map(rx => ({ source: rx.source, flags: rx.flags })));
}

function composeLovableHero(result) {
  const hit = result.gradient.verdict === 'fail' && result.centered.verdict === 'fail';
  return { verdict: hit ? 'fail' : 'pass', detail: 'gradient+centered hero composition' };
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
// Try networkidle first (best for completeness). Fall back to domcontentloaded
// for sites with persistent connections (analytics, websockets) that never
// settle. Many live marketing sites need this.
try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
} catch {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
}
await page.waitForTimeout(800);

const inPage = await runInPage(page);
if (shotPath) await page.screenshot({ path: shotPath, fullPage: true });

const report = {
  url,
  captured_at: new Date().toISOString(),
  checks: {
    font: { ...inPage.font, fix_hint: 'Pick an editorial display face (Tobias, Sohne, FK Display, NB International, GT Walsheim). Use monospace numerals for prices/dates.' },
    gradient: { ...inPage.gradient, fix_hint: 'Drop cyan->violet / pink->orange default. Go flat or shift a stop off-brand.' },
    feature_grid: { ...inPage.feature_grid, fix_hint: 'Break the 3-column grid: numbered editorial list, asymmetric layout, or step-by-step flow.' },
    section_rhythm: { ...inPage.section_rhythm, fix_hint: 'Vary section heights. Add at least one full-bleed or sharply shorter section.' },
    centered: { ...inPage.centered, fix_hint: 'Move at least one major section to left-aligned with a fixed measure.' },
    lovable_hero_composition: composeLovableHero(inPage),
    lovable_pricing: { ...inPage.lovable_pricing, fix_hint: 'Drop the highlighted-middle-tier pattern; try 2 tiers or 4, or no visual hierarchy between tiers.' },
    lovable_footer: { ...inPage.lovable_footer, fix_hint: 'Remove the "Made with Lovable" footer link.' },
  },
  needs_human_review: {
    testimonials: { reason: 'Avatar realness and quote authenticity require vision/lookup.', candidates: inPage._harvest.testimonials },
    stock_illustrations: { reason: 'unDraw/Storyset detection requires SVG-signature DB or vision.', candidates_imgs: inPage._harvest.hero_images, candidates_svgs: inPage._harvest.hero_svgs },
    animation_purpose: { reason: 'Presence detected, purpose is judgment.', signal: inPage._harvest.animation },
    weird_moment: { reason: 'Pure taste call.', see_screenshot: !!shotPath },
  },
};

const json = JSON.stringify(report, null, 2);
if (outPath) await writeFile(outPath, json);
else console.log(json);

await browser.close();
