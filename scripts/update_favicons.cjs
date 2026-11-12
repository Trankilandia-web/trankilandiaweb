const fs = require('fs');

const b64 = fs.readFileSync('public/favicon-256.png').toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <clipPath id="circleClip">
    <circle cx="128" cy="128" r="128" />
  </clipPath>
  <image href="data:image/png;base64,${b64}" width="256" height="256" clip-path="url(#circleClip)" />
</svg>`;

fs.writeFileSync('public/favicon.svg', svg);
fs.writeFileSync('public/vite.svg', svg);
console.log('favicon.svg and vite.svg updated successfully');
