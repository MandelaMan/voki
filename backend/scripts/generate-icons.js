const sharp = require('sharp');
const path = require('path');

const dir = path.join(__dirname, '..', '..', 'frontend', 'public');

const shop = `
  <g fill="none" stroke="#fff" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 14h36a2 2 0 0 1 2 2v7c-1.7 7-6.3 7-8 0-1.7 7-6.3 7-8 0-1.7 7-6.3 7-8 0-1.7 7-6.3 7-8 0-1.7 7-6.3 7-8 0V16a2 2 0 0 1 2-2z"/>
    <path d="M20 14v9M28 14v9M36 14v9M44 14v9"/>
    <rect x="16.5" y="32" width="31" height="18" rx="2.5"/>
    <path d="M22 50V41.2a3.2 3.2 0 0 1 6.4 0V50"/>
    <rect x="33.4" y="35.6" width="11.2" height="11.2" rx="1.4"/>
    <rect x="36.3" y="38.5" width="5.4" height="5.4" rx="0.7"/>
  </g>`;

function svg(size, scale) {
  const mark = scale === 1
    ? shop
    : `<g transform="translate(32 32) scale(${scale}) translate(-32 -32)">${shop}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    <rect width="64" height="64" fill="#3b5fe6"/>
    ${mark}
  </svg>`;
}

async function write(name, size, scale) {
  await sharp(Buffer.from(svg(size, scale))).png().toFile(path.join(dir, name));
  console.log(`Created ${name}`);
}

Promise.all([
  write('pwa-192x192.png', 192, 1),
  write('pwa-512x512.png', 512, 1),
  write('pwa-maskable-512x512.png', 512, 0.72),
  write('apple-touch-icon.png', 180, 1),
]).catch((error) => {
  console.error(error);
  process.exit(1);
});
