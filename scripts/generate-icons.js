const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ASSETS = path.join(__dirname, "..", "assets");

// SVG overlay: simple "In" monogram or checkmark
// Using a clean design: blue rounded square with white "IO" mark
function svgIcon(size) {
  const pad = Math.round(size * 0.08);
  const inner = size - pad * 2;
  const r = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.48);
  const checkSize = Math.round(size * 0.35);
  const cx = size / 2;
  const cy = size / 2;

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${size}" height="${size}" rx="${r}" fill="url(#bg)"/>
  <text x="${cx}" y="${cy + Math.round(size * 0.16)}" text-anchor="middle" font-family="system-ui"
        font-size="${fontSize}" font-weight="800" fill="white" letter-spacing="${Math.round(size * (-0.01))}">
    IO
  </text>
</svg>`;
}

function androidForeground(size) {
  const pad = Math.round(size * 0.1);
  const inner = size - pad * 2;
  const r = Math.round(size * 0.15);
  const cx = size / 2;
  const cy = size / 2;
  const fontSize = Math.round(size * 0.4);

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${r}" fill="white"/>
  <text x="${cx}" y="${cy + Math.round(size * 0.13)}" text-anchor="middle"
        font-family="system-ui" font-size="${fontSize}" font-weight="800"
        fill="#2563eb" letter-spacing="${Math.round(size * (-0.01))}">
    IO
  </text>
</svg>`;
}

function androidMonochrome(size) {
  const pad = Math.round(size * 0.1);
  const inner = size - pad * 2;
  const r = Math.round(size * 0.15);
  const cx = size / 2;
  const cy = size / 2;
  const fontSize = Math.round(size * 0.4);

  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${r}" fill="white"/>
  <text x="${cx}" y="${cy + Math.round(size * 0.13)}" text-anchor="middle"
        font-family="system-ui" font-size="${fontSize}" font-weight="800"
        fill="#1d4ed8" letter-spacing="${Math.round(size * (-0.01))}">
    IO
  </text>
</svg>`;
}

async function renderSVG(svg, width, outputPath) {
  const buf = Buffer.from(svg);
  await sharp(buf).resize(width, width).png().toFile(outputPath);
  console.log(`  ✓ ${path.basename(outputPath)} (${width}x${width})`);
}

async function main() {
  console.log("Generating app icons...\n");

  // Main app icon (1024x1024)
  await renderSVG(svgIcon(1024), 1024, path.join(ASSETS, "icon.png"));

  // Splash icon (128x128)
  await renderSVG(svgIcon(256), 128, path.join(ASSETS, "splash-icon.png"));

  // Favicon (48x48)
  await renderSVG(svgIcon(48), 48, path.join(ASSETS, "favicon.png"));

  // Android adaptive icons (1024x1024 for source)
  await renderSVG(androidForeground(1024), 1024, path.join(ASSETS, "android-icon-foreground.png"));
  await renderSVG(androidMonochrome(1024), 1024, path.join(ASSETS, "android-icon-monochrome.png"));

  // Android background is a solid color — keep the existing one or generate a simple one
  // Just recreate the background as a solid blue square
  const bg = Buffer.from(
    `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <rect width="1024" height="1024" fill="#E6F4FE"/>
    </svg>`
  );
  await sharp(bg).resize(1024, 1024).png().toFile(path.join(ASSETS, "android-icon-background.png"));

  console.log("\n✅ All icons generated!");
}

main().catch(console.error);
