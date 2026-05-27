/**
 * Icon generation script for 3DT projects
 * Generates all favicon / app-icon / PWA icon sizes from the transparent logo PNG,
 * composited onto a #1b3d2a (dark green) background.
 *
 * Run from 3dt-app root:  node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = join(__dirname, '..');

const INPUT     = 'C:/Users/wideo/Downloads/Sophisticated Leaf Logo with Organic Flow (2).png';
const BG        = { r: 27, g: 61, b: 42, alpha: 1 };  // #1b3d2a

// ─── output targets ────────────────────────────────────────────────────────
const TARGETS = [
  // 3dt-app
  { path: join(ROOT, 'public/favicon-16x16.png'),        size: 16  },
  { path: join(ROOT, 'public/favicon-32x32.png'),        size: 32  },
  { path: join(ROOT, 'public/apple-touch-icon.png'),     size: 180 },
  { path: join(ROOT, 'public/icon-192.png'),             size: 192 },
  { path: join(ROOT, 'public/icon-512.png'),             size: 512 },
  { path: join(ROOT, 'app/icon.png'),                    size: 512 },
  { path: join(ROOT, 'app/apple-icon.png'),              size: 180 },

  // 3rddavidstechnology website
  { path: 'C:/Users/wideo/3rddavidstechnology/public/favicon-16x16.png',    size: 16  },
  { path: 'C:/Users/wideo/3rddavidstechnology/public/favicon-32x32.png',    size: 32  },
  { path: 'C:/Users/wideo/3rddavidstechnology/public/apple-touch-icon.png', size: 180 },
  { path: 'C:/Users/wideo/3rddavidstechnology/public/icon-192.png',         size: 192 },
  { path: 'C:/Users/wideo/3rddavidstechnology/public/icon-512.png',         size: 512 },
  { path: 'C:/Users/wideo/3rddavidstechnology/app/icon.png',                size: 512 },
  { path: 'C:/Users/wideo/3rddavidstechnology/app/apple-icon.png',          size: 180 },
];

// ─── helpers ───────────────────────────────────────────────────────────────

/** Build ICO buffer (single PNG-embedded image) */
function buildIco(pngBuf, size) {
  const header = Buffer.from([0,0, 1,0, 1,0]);           // ICONDIR (1 image)
  const entry  = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);           // width  (0 = 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1);           // height (0 = 256)
  entry.writeUInt8(0,  2);                                // color count
  entry.writeUInt8(0,  3);                                // reserved
  entry.writeUInt16LE(1,  4);                             // planes
  entry.writeUInt16LE(32, 6);                             // bit count
  entry.writeUInt32LE(pngBuf.length, 8);                  // bytes in resource
  entry.writeUInt32LE(22, 12);                            // image offset (6+16)
  return Buffer.concat([header, entry, pngBuf]);
}

async function generateIcon(size) {
  const pad      = Math.round(size * 0.12);
  const inner    = size - pad * 2;

  // Resize logo with transparent padding, then composite onto solid bg
  const logoResized = await sharp(INPUT)
    .resize(inner, inner, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } })
    .ensureAlpha()
    .toBuffer();

  const pngBuf = await sharp({
    create: { width: size, height: size, channels: 4, background: BG }
  })
  .composite([{ input: logoResized, top: pad, left: pad }])
  .png()
  .toBuffer();

  return { pngBuf };
}

// ─── main ──────────────────────────────────────────────────────────────────
const sizes = [...new Set(TARGETS.map(t => t.size))];
const cache = {};

console.log('⏳  Generating icons…\n');

for (const size of sizes) {
  cache[size] = await generateIcon(size);
}

for (const { path: outPath, size } of TARGETS) {
  mkdirSync(dirname(outPath), { recursive: true });
  const { pngBuf } = cache[size];
  const isFavIco   = outPath.endsWith('favicon.ico');
  writeFileSync(outPath, isFavIco ? buildIco(pngBuf, size) : pngBuf);
  console.log(`  ✅  ${outPath.replace(/C:\/Users\/wideo\//,'')}`);
}

// Also write favicon.ico files (32x32 PNG embedded in ICO)
const ico32 = buildIco(cache[32].pngBuf, 32);
writeFileSync(join(ROOT, 'public/favicon.ico'), ico32);
writeFileSync(join(ROOT, 'app/favicon.ico'), ico32);
writeFileSync('C:/Users/wideo/3rddavidstechnology/public/favicon.ico', ico32);
writeFileSync('C:/Users/wideo/3rddavidstechnology/app/favicon.ico', ico32);
console.log(`  ✅  favicon.ico (both projects)\n`);

console.log('🎉  All icons generated!');
