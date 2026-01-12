// Simple script to generate PWA icons
// Run with: node scripts/generateIcons.js

const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create SVG icon template
const createSvgIcon = (size) => {
  const padding = Math.floor(size * 0.15);
  const innerSize = size - (padding * 2);
  const fontSize = Math.floor(size * 0.35);
  const subtitleSize = Math.floor(size * 0.1);

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a"/>
      <stop offset="100%" style="stop-color:#1e293b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#06b6d4"/>
      <stop offset="100%" style="stop-color:#0891b2"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.18)}" fill="url(#bg)"/>
  <text x="${size/2}" y="${size * 0.52}" font-family="system-ui, -apple-system, sans-serif" font-size="${fontSize}" font-weight="700" fill="url(#accent)" text-anchor="middle">IE</text>
  <text x="${size/2}" y="${size * 0.72}" font-family="system-ui, -apple-system, sans-serif" font-size="${subtitleSize}" font-weight="500" fill="#94a3b8" text-anchor="middle">CENTRAL</text>
</svg>`;
};

// Generate icons
sizes.forEach(size => {
  const svg = createSvgIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Created ${filename}`);
});

// Create apple-touch-icon (180x180)
const appleTouchIcon = createSvgIcon(180);
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), appleTouchIcon);
console.log('Created apple-touch-icon.svg');

// Create favicon.svg
const favicon = createSvgIcon(32);
fs.writeFileSync(path.join(__dirname, '../public/favicon.svg'), favicon);
console.log('Created favicon.svg');

console.log('\nNote: For production, convert these SVG files to PNG using a tool like:');
console.log('- Sharp (npm install sharp)');
console.log('- ImageMagick: convert icon.svg icon.png');
console.log('- Online tool: https://cloudconvert.com/svg-to-png');
