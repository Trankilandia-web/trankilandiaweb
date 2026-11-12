const fs = require('fs');
const QRCode = require('qrcode');

// Generate QR Code
QRCode.toString('72481920', { type: 'svg', errorCorrectionLevel: 'M', margin: 2, width: 220 }, (err, svg) => {
  if (err) throw err;
  fs.writeFileSync('./tutorial-portal-cliente/assets/qrcode.svg', svg);
  console.log('QRCode SVG generated!');
});

// Barcode generation
const tsCode = fs.readFileSync('./src/lib/barcode128.ts', 'utf8');
const patternsMatch = tsCode.match(/const CODE128_PATTERNS: Record<number, number\[\]> = \{[\s\S]*?\};/);
if (patternsMatch) {
  const codeStr = patternsMatch[0].replace(': Record<number, number[]>', '');
  eval(codeStr);
  
  const text = '72481920';
  const codes = [104];
  let checksum = 104;
  for (let i = 0; i < text.length; i++) {
    const val = text.charCodeAt(i) - 32;
    codes.push(val);
    checksum += val * (i + 1);
  }
  codes.push(checksum % 103);
  codes.push(106);

  const quietZone = 24;
  const moduleWidth = 2.4;
  const height = 70;
  let currentX = quietZone;
  const bars = [];

  codes.forEach(code => {
    const pattern = CODE128_PATTERNS[code];
    let isBlack = true;
    for (const w of pattern) {
      if (isBlack) {
        bars.push({ x: currentX, width: w * moduleWidth });
      }
      currentX += w * moduleWidth;
      isBlack = !isBlack;
    }
  });

  const totalWidth = Math.ceil(currentX + quietZone);
  const totalHeight = height + 28;
  const rects = bars.map(b => `<rect x="${b.x.toFixed(1)}" y="8" width="${b.width.toFixed(1)}" height="${height}" fill="#000000" />`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${totalHeight}" shape-rendering="crispEdges">
  <rect width="100%" height="100%" fill="#ffffff" rx="8" />
  ${rects}
  <text x="${totalWidth / 2}" y="${totalHeight - 6}" font-family="monospace" font-size="14" font-weight="bold" fill="#000000" text-anchor="middle" letter-spacing="4">72481920</text>
</svg>`;
  fs.writeFileSync('./tutorial-portal-cliente/assets/barcode.svg', svg);
  console.log('Barcode SVG generated! totalWidth =', totalWidth);
}
