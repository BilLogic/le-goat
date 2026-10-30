/**
 * Social previews of the site's landing section: the live hero (title, line, the deck of real questions; no byline), alone and
 * centered in each platform's frame. LinkedIn gets the 4:5 feed (a GIF); Instagram the 9:16 story reel (an MP4, since Stories don't play an uploaded GIF). Writes a still and, with --video, a screencast for social.sh.
 * Usage: node pipeline/social.mjs [--video] [name ...]
 * Output (local only): source/social/<name>@2x.png; with --video, source/social/<name>/f_*.jpg + frames.txt (ffmpeg concat list) for social.sh.
 * Needs the site served at http://localhost:8771/index.html.
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'source/social');
const SCALE = 2;

/**
 * Each frame: CSS viewport, output size, and how the hero is set for it (title size, deck height, the gap above the deck).
 * @type {{name: string, w: number, h: number, out: [number, number], title: string, cv: number, gap: number, side?: number}[]}
 */
const FRAMES = [
  { name: 'li-feed-4x5', w: 864, h: 1080, out: [1080, 1350], title: '54px', cv: 460, gap: 40 },
  { name: 'story-reel-9x16', w: 608, h: 1080, out: [1080, 1920], title: '50px', cv: 540, gap: 48, side: 28 },
];

/**
 * The composition: everything but the hero leaves, and the hero sits centered in the frame at the frame's sizes.
 * @param {{title: string, cv: number, gap: number, side?: number}} f
 * @returns {string} CSS
 */
const css = (f) => `
  main>*:not(#hero),body>*:not(main):not(script):not(template),.toc,.toc-btn,.prog,.toc-veil,#hero .byline{display:none!important}
  html,body{height:100%;overflow:hidden!important;scrollbar-width:none}
  main.wrap{min-height:100vh;display:flex;flex-direction:column;justify-content:center;padding:0 ${f.side || 0}px;box-sizing:border-box}
  main>#hero{padding:0 0 ${Math.round(f.cv * 0.04)}px;margin:0}
  #hero .title-xl{font-size:${f.title};line-height:1.08;letter-spacing:-.025em;text-wrap:balance;max-width:16ch;margin-inline:auto}
  #hero .deck{--cv-max:${f.cv}px!important;margin-top:${f.gap}px}`;

/**
 * Opens the site at a frame's size with the composition applied, scrolled to the top.
 * @param {import('playwright').Browser} browser
 * @param {typeof FRAMES[number]} f
 * @returns {Promise<import('playwright').Page>}
 */
const open = async (browser, f) => {
  const page = await browser.newPage({ viewport: { width: f.w, height: f.h }, deviceScaleFactor: SCALE });
  await page.goto(`http://localhost:8771/index.html?v=${Date.now()}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: css(f) });
  await page.evaluate(() => { scrollTo(0, 0); dispatchEvent(new Event('resize')); return document.fonts.ready; });
  return page;
};

/**
 * A still at the deck's busiest moment.
 * @param {import('playwright').Browser} browser
 * @param {typeof FRAMES[number]} f
 * @returns {Promise<void>}
 */
const still = async (browser, f) => {
  const page = await open(browser, f);
  await page.waitForTimeout(13000);
  await page.screenshot({ path: path.join(OUT, `${f.name}@2x.png`) });
  await page.close();
};

/**
 * Screencast frames of the deck playing, for the MP4.
 * @param {import('playwright').Browser} browser
 * @param {typeof FRAMES[number]} f
 * @param {number} secs
 * @returns {Promise<number>} frame count
 */
const video = async (browser, f, secs = 26) => {
  const page = await open(browser, f);
  const dir = path.join(OUT, f.name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    frames.push({ t: metadata.timestamp * 1000, data });
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: f.w * SCALE, maxHeight: f.h * SCALE, everyNthFrame: 1 });
  await page.waitForTimeout(secs * 1000);
  await cdp.send('Page.stopScreencast');
  await page.close();
  const list = frames.map((fr, i) => {
    const file = `f_${String(i).padStart(5, '0')}.jpg`;
    fs.writeFileSync(path.join(dir, file), Buffer.from(fr.data, 'base64'));
    const next = frames[i + 1] ? frames[i + 1].t : fr.t + 100;
    return `file '${file}'\nduration ${((next - fr.t) / 1000).toFixed(4)}`;
  });
  fs.writeFileSync(path.join(dir, 'frames.txt'), list.join('\n') + '\n');
  return frames.length;
};

const args = process.argv.slice(2);
const wantVideo = args.includes('--video');
const names = args.filter((a) => !a.startsWith('--'));
fs.mkdirSync(OUT, { recursive: true });
// screencast frames ignore the context's deviceScaleFactor; only the launch flag gives true 2× frames
const browser = await chromium.launch({ args: [`--force-device-scale-factor=${SCALE}`] });
for (const f of FRAMES.filter((x) => !names.length || names.includes(x.name))) {
  if (wantVideo) console.log(f.name, await video(browser, f), 'frames');
  else { await still(browser, f); console.log(f.name, 'still'); }
}
await browser.close();
