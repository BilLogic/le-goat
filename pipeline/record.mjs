/**
 * Records the article's live figures as timestamped screencast frames, cropped to each figure.
 * Usage: node pipeline/record.mjs [figIndex ...]   (indices follow `figure.fig` order in article/index.html)
 * Output: source/figures/<name>/f_<ms>.jpg plus frames.txt (an ffmpeg concat list with real durations); local only.
 * Needs the article served at http://localhost:8771/article/index.html.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCALE = 2;

/** @type {Record<number, {name: string, secs: number}>} */
const FIGS = {
  0: { name: '01-hero-wall', secs: 26 },
  5: { name: '06-wired', secs: 40 },
  6: { name: '07-manners', secs: 48 },
  7: { name: '08-mvp', secs: 100 },
  8: { name: '09-pilot', secs: 7 },
  12: { name: '13-proactive', secs: 40 },
  13: { name: '14-under-the-hood', secs: 36 },
  14: { name: '15-impact', secs: 16 },
};

/**
 * Records one figure: scrolls it in from below so its entrance plays, keeps frames from the first one after it lands.
 * @param {import('playwright').Browser} browser
 * @param {number} idx
 * @param {{name: string, secs: number}} spec
 * @returns {Promise<number>} frame count
 */
const recordFig = async (browser, idx, { name, secs }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 }, deviceScaleFactor: SCALE });
  await page.goto(`http://localhost:8771/article/index.html?v=${Date.now()}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const top = await page.evaluate(i => {
    const f = document.querySelectorAll('figure.fig')[i];
    return f.getBoundingClientRect().top + scrollY;
  }, idx);
  await page.evaluate(y => scrollTo(0, y), Math.max(0, top - 2600));
  await page.waitForTimeout(400);

  const dir = path.join(ROOT, 'source/figures', name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  let landedAt = null;
  let box = null;
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    if (landedAt !== null && metadata.timestamp * 1000 >= landedAt) frames.push({ t: metadata.timestamp * 1000, data });
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: 1280 * SCALE, maxHeight: 1400 * SCALE, everyNthFrame: 1 });

  await page.evaluate(i => document.querySelectorAll('figure.fig')[i].scrollIntoView({ block: 'center' }), idx);
  box = await page.evaluate(i => {
    const r = (document.querySelectorAll('figure.fig')[i].querySelector('.fig-frame') || document.querySelectorAll('figure.fig')[i]).getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }, idx);
  landedAt = Date.now();
  await page.waitForTimeout(secs * 1000);
  await cdp.send('Page.stopScreencast');
  await page.close();

  const crop = `${Math.round(box.w * SCALE)}:${Math.round(box.h * SCALE)}:${Math.round(box.x * SCALE)}:${Math.round(box.y * SCALE)}`;
  const list = frames.map((f, i) => {
    const file = `f_${String(i).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(dir, file), Buffer.from(f.data, 'base64'));
    const next = frames[i + 1] ? frames[i + 1].t : f.t + 100;
    return `file '${file}'\nduration ${((next - f.t) / 1000).toFixed(4)}`;
  });
  fs.writeFileSync(path.join(dir, 'frames.txt'), list.join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'crop.txt'), crop);
  return frames.length;
};

// screencast frames ignore the context's deviceScaleFactor; only the launch flag gives true 2× frames
const browser = await chromium.launch({ args: [`--force-device-scale-factor=${SCALE}`] });
const want = process.argv.slice(2).map(Number);
for (const [idx, spec] of Object.entries(FIGS)) {
  if (want.length && !want.includes(+idx)) continue;
  const n = await recordFig(browser, +idx, spec);
  console.log(spec.name, n, 'frames');
}
await browser.close();
