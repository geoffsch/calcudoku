// Generates the maskable PNG app icons (assets/icons/icon-192.png, -512.png)
// with no image dependencies: draws onto an RGBA buffer and encodes PNG by
// hand (zlib is built into Node). Rerun after changing the design:
//
//   node tools/make-icons.js
//
// Design mirrors icon.svg: a 3×3 Calcudoku grid with thick cage walls and
// +, ÷, − operation glyphs (drawn from rectangles — no font rasterisation).
// Icons are full-bleed for `purpose: maskable`; all content stays inside the
// central 80% safe zone.

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "icons");

const BG = [0x1e, 0x24, 0x30, 0xff]; // app background
const GRID = [0x4a, 0x52, 0x62, 0xff]; // thin grid lines
const CAGE = [0xe6, 0xe9, 0xef, 0xff]; // thick cage walls
const GLYPH = [0x5b, 0x9b, 0xd5, 0xff]; // accent for the op symbols

function drawIcon(S) {
  const px = new Uint8Array(S * S * 4);
  const rect = (x0, y0, x1, y1, color) => {
    x0 = Math.max(0, Math.round(x0));
    y0 = Math.max(0, Math.round(y0));
    x1 = Math.min(S, Math.round(x1));
    y1 = Math.min(S, Math.round(y1));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) px.set(color, (y * S + x) * 4);
    }
  };

  rect(0, 0, S, S, BG);

  // 3×3 grid inside the maskable safe zone.
  const g0 = 0.16 * S;
  const g1 = 0.84 * S;
  const cs = (g1 - g0) / 3; // cell size
  const thin = Math.max(1, 0.012 * S);
  const thick = Math.max(2, 0.034 * S);

  // Thin inner lines.
  for (let i = 1; i < 3; i++) {
    rect(g0 + i * cs - thin / 2, g0, g0 + i * cs + thin / 2, g1, GRID);
    rect(g0, g0 + i * cs - thin / 2, g1, g0 + i * cs + thin / 2, GRID);
  }

  // Thick outer border.
  rect(g0 - thick / 2, g0 - thick / 2, g1 + thick / 2, g0 + thick / 2, CAGE);
  rect(g0 - thick / 2, g1 - thick / 2, g1 + thick / 2, g1 + thick / 2, CAGE);
  rect(g0 - thick / 2, g0, g0 + thick / 2, g1, CAGE);
  rect(g1 - thick / 2, g0, g1 + thick / 2, g1, CAGE);

  // Cage walls (an L-shaped cage top-left, a 2-cell cage bottom-right).
  rect(g0 + cs - thick / 2, g0, g0 + cs + thick / 2, g0 + 2 * cs, CAGE); // vertical
  rect(g0, g0 + 2 * cs - thick / 2, g0 + 2 * cs, g0 + 2 * cs + thick / 2, CAGE); // horizontal
  rect(g0 + 2 * cs - thick / 2, g0 + cs, g0 + 2 * cs + thick / 2, g1, CAGE); // vertical right

  // Operation glyphs, one per showcase cell (bar thickness b, arm length a).
  const b = 0.045 * S;
  const a = 0.075 * S;
  const glyphAt = (cx, cy, kind) => {
    if (kind === "+") {
      rect(cx - a, cy - b / 2, cx + a, cy + b / 2, GLYPH);
      rect(cx - b / 2, cy - a, cx + b / 2, cy + a, GLYPH);
    } else if (kind === "-") {
      rect(cx - a, cy - b / 2, cx + a, cy + b / 2, GLYPH);
    } else if (kind === "÷") {
      rect(cx - a, cy - b / 2, cx + a, cy + b / 2, GLYPH);
      rect(cx - b / 2, cy - a, cx + b / 2, cy - a + b, GLYPH);
      rect(cx - b / 2, cy + a - b, cx + b / 2, cy + a, GLYPH);
    }
  };
  glyphAt(g0 + 0.5 * cs, g0 + 0.5 * cs, "+");
  glyphAt(g0 + 2.5 * cs, g0 + 1.5 * cs, "÷");
  glyphAt(g0 + 1.5 * cs, g0 + 2.5 * cs, "-");

  return px;
}

// --- Minimal PNG encoder (8-bit RGBA, no interlace) --------------------------

function crc32(buf) {
  let c;
  const table = [];
  for (let i = 0; i < 256; i++) {
    c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const byte of buf) crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(8 + data.length + 4);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(px, S) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0);
  ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  // compression 0, filter 0, interlace 0

  // Raw scanlines, each prefixed with filter byte 0.
  const raw = Buffer.alloc(S * (S * 4 + 1));
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0;
    Buffer.from(px.buffer, y * S * 4, S * 4).copy(raw, y * (S * 4 + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [192, 512]) {
  const file = join(OUT_DIR, `icon-${size}.png`);
  writeFileSync(file, encodePng(drawIcon(size), size));
  console.log(`wrote ${file}`);
}
