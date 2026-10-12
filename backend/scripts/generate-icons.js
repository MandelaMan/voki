const sharp = require('sharp');
const path = require('path');

const dir = path.join(__dirname, '..', '..', 'frontend', 'public');

async function make(size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
    <rect width="100%" height="100%" rx="${size * 0.2}" fill="#6366f1"/>
    <text x="50%" y="54%" font-size="${size * 0.45}" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-weight="bold">V</text>
  </svg>`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(dir, `pwa-${size}x${size}.png`));
  console.log(`Created pwa-${size}x${size}.png`);
}

Promise.all([192, 512].map(make));
