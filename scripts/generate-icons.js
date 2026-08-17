const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const outDir = path.join(__dirname, "..", "extension", "icons");

function rgba(hex, alpha = 255) {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
    alpha
  ];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mix(a, b, t) {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
    Math.round(lerp(a[3], b[3], t))
  ];
}

function roundedRect(x, y, w, h, r, px, py) {
  const cx = Math.max(x + r, Math.min(px, x + w - r));
  const cy = Math.max(y + r, Math.min(py, y + h - r));
  return (px - cx) ** 2 + (py - cy) ** 2 <= r ** 2;
}

function inPoly(points, px, py) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function nearLine(x1, y1, x2, y2, px, py, width) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  const x = x1 + t * dx;
  const y = y1 + t * dy;
  return (px - x) ** 2 + (py - y) ** 2 <= (width / 2) ** 2;
}

function drawIcon(size) {
  const scale = 4;
  const canvas = size * scale;
  const pixels = Buffer.alloc(canvas * canvas * 4);
  const bgTop = rgba("#0f766e");
  const bgBottom = rgba("#1d4ed8");
  const bgAccent = rgba("#14b8a6");
  const paper = rgba("#ffffff");
  const paperShade = rgba("#dbeafe");
  const ink = rgba("#1e3a8a");
  const mark = rgba("#22d3ee");
  const transparent = [0, 0, 0, 0];

  function set(x, y, color) {
    const i = (y * canvas + x) * 4;
    pixels[i] = color[0];
    pixels[i + 1] = color[1];
    pixels[i + 2] = color[2];
    pixels[i + 3] = color[3];
  }

  for (let y = 0; y < canvas; y += 1) {
    for (let x = 0; x < canvas; x += 1) {
      const px = x / scale;
      const py = y / scale;
      let color = transparent;
      if (roundedRect(0, 0, size, size, size * 0.24, px, py)) {
        color = mix(bgTop, bgBottom, py / size);
      }

      if (roundedRect(size * 0.08, size * 0.08, size * 0.84, size * 0.84, size * 0.18, px, py)) {
        const sheen = Math.max(0, 1 - ((px - size * 0.20) ** 2 + (py - size * 0.16) ** 2) / (size * size * 0.30));
        color = mix(color, bgAccent, sheen * 0.28);
      }

      const vault = { x: size * 0.22, y: size * 0.20, w: size * 0.58, h: size * 0.62 };
      if (roundedRect(vault.x, vault.y, vault.w, vault.h, size * 0.06, px, py)) {
        color = paper;
      }
      if (roundedRect(vault.x + size * 0.05, vault.y + size * 0.08, vault.w * 0.80, vault.h * 0.78, size * 0.03, px, py)) {
        color = paperShade;
      }

      const doc = [
        [size * 0.34, size * 0.20],
        [size * 0.67, size * 0.20],
        [size * 0.78, size * 0.31],
        [size * 0.78, size * 0.76],
        [size * 0.34, size * 0.76]
      ];
      if (inPoly(doc, px, py)) color = paper;
      const fold = [
        [size * 0.67, size * 0.20],
        [size * 0.78, size * 0.31],
        [size * 0.67, size * 0.31]
      ];
      if (inPoly(fold, px, py)) color = paperShade;

      const lines = [
        [0.43, 0.43, 0.68],
        [0.43, 0.53, 0.71],
        [0.43, 0.63, 0.62]
      ];
      for (const [x1, yy, x2] of lines) {
        if (nearLine(size * x1, size * yy, size * x2, size * yy, px, py, size * 0.045)) color = ink;
      }

      const mLines = [
        [0.18, 0.62, 0.18, 0.39],
        [0.18, 0.39, 0.27, 0.51],
        [0.27, 0.51, 0.36, 0.39],
        [0.36, 0.39, 0.36, 0.62]
      ];
      for (const [x1, y1, x2, y2] of mLines) {
        if (nearLine(size * x1, size * y1, size * x2, size * y2, px, py, size * 0.06)) color = mark;
      }

      if (nearLine(size * 0.18, size * 0.72, size * 0.33, size * 0.72, px, py, size * 0.055)) {
        color = mark;
      }

      set(x, y, color);
    }
  }

  return encodePng(size, size, downsample(pixels, size, scale));
}

function downsample(pixels, size, scale) {
  const canvas = size * scale;
  const down = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sum = [0, 0, 0, 0];
      for (let yy = 0; yy < scale; yy += 1) {
        for (let xx = 0; xx < scale; xx += 1) {
          const i = (((y * scale + yy) * canvas) + (x * scale + xx)) * 4;
          for (let c = 0; c < 4; c += 1) sum[c] += pixels[i + c];
        }
      }
      const o = (y * size + x) * 4;
      for (let c = 0; c < 4; c += 1) down[o + c] = Math.round(sum[c] / (scale * scale));
    }
  }
  return down;
}

function crc32(buf) {
  let crc = ~0;
  for (const byte of buf) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  name.copy(out, 4);
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return out;
}

function encodePng(width, height, rgbaData) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    rgbaData.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function svg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#0f766e"/>
      <stop offset="1" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="31" fill="url(#bg)"/>
  <rect x="10" y="10" width="108" height="108" rx="23" fill="#14b8a6" opacity=".22"/>
  <rect x="28" y="26" width="74" height="79" rx="8" fill="#dbeafe"/>
  <path d="M44 26h42l14 14v58H44z" fill="#fff"/>
  <path d="M86 26v14h14z" fill="#dbeafe"/>
  <path d="M55 55h32M55 68h36M55 81h24" stroke="#1e3a8a" stroke-width="7" stroke-linecap="round"/>
  <path d="M23 79V50l12 15 12-15v29M23 93h20" fill="none" stroke="#22d3ee" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;
}

fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) {
  fs.writeFileSync(path.join(outDir, `icon${size}.png`), drawIcon(size));
  fs.writeFileSync(path.join(outDir, `icon${size}.svg`), svg(size));
}
