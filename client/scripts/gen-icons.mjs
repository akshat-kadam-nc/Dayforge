// One-off brand asset generator. Run with: node scripts/gen-icons.mjs
// Source art lives in assets/brand/ (not shipped). Outputs PWA icons into
// public/ and a transparent wordmark into public/brand/. Re-run whenever the
// source logo changes.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = resolve(__dirname, '..', 'public');
const src = resolve(__dirname, '..', 'assets', 'brand');

const NAVY = { r: 0x02, g: 0x15, b: 0x2c };
const monogram = resolve(src, 'dayforge_logoform.svg');

/** Render the monogram trimmed and centered on a square with given padding. */
async function icon(size, pad, bg, out) {
  const inner = Math.round(size * (1 - pad));
  // The SVG is 4096px intrinsic; density 96 renders ~5.5k px, ample and under limits.
  const mark = await sharp(monogram, { density: 96 })
    .trim() // drop the SVG's transparent margin so the mark fills the safe area
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(resolve(pub, out));
  console.log('  ', out);
}

/** Key near-white pixels to transparent so the wordmark sits on glass. */
async function wordmarkTransparent() {
  const wordmarkSrc = resolve(src, 'dayforge_lettering-2.png');
  const { data, info } = await sharp(wordmarkSrc)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Fade out background: fully transparent for near-white, soft edge in between.
    const min = Math.min(r, g, b);
    if (min > 248) data[i + 3] = 0;
    else if (min > 220) data[i + 3] = Math.round(((248 - min) / 28) * 255);
  }
  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(resolve(pub, 'brand', 'wordmark.png'));
  console.log('   brand/wordmark.png (white keyed out)');
}

const white = { r: 255, g: 255, b: 255, alpha: 1 };

console.log('Generating brand assets…');
// Standard icons on white, ~14% padding.
await icon(192, 0.14, white, 'pwa-192.png');
await icon(512, 0.14, white, 'pwa-512.png');
// Maskable: white field (the mark is navy, so a navy field would hide it),
// extra padding so nothing clips inside the platform's safe-zone mask.
await icon(512, 0.3, white, 'pwa-maskable-512.png');
// iOS home screen (no transparency allowed → white).
await icon(180, 0.14, white, 'apple-touch-icon.png');
await wordmarkTransparent();
console.log('Done.');
