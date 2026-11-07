const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

async function runLocalAudit() {
  console.log('--- INICIANDO SERVIDOR PREVIEW PARA AUDITORÍA MÓVIL ---');
  
  // Start vite preview on port 4173
  const previewProcess = spawn('npx.cmd', ['vite', 'preview', '--port', '4173'], {
    shell: true,
    cwd: path.join(__dirname, '..'),
  });

  // Wait for server to be ready
  await new Promise((resolve, reject) => {
    let started = false;
    previewProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('4173') || msg.includes('Local:')) {
        if (!started) {
          started = true;
          resolve();
        }
      }
    });
    previewProcess.stderr.on('data', (data) => {
      console.error('Preview stderr:', data.toString());
    });
    setTimeout(() => {
      if (!started) resolve(); // Continue anyway
    }, 5000);
  });

  console.log('Servidor listo en http://localhost:4173');

  const browser = await chromium.launch({ headless: true });
  const screenshotsDir = path.join(__dirname, '..', 'audit_screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  const viewports = [
    { name: 'iPhone_SE', width: 375, height: 667 },
    { name: 'iPhone_14', width: 390, height: 844 },
    { name: 'Android_Standard', width: 412, height: 915 },
  ];

  for (const vp of viewports) {
    console.log(`\n========================================`);
    console.log(`AUDITANDO VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`========================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    const pagesToTest = [
      { name: 'home', path: '/' },
      { name: 'planes', path: '/planes' },
      { name: 'clases', path: '/clases' },
      { name: 'instalaciones', path: '/instalaciones' },
    ];

    for (const p of pagesToTest) {
      await page.goto(`http://localhost:4173${p.path}`, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForTimeout(500);

      // Check overflow
      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const bodyWidth = document.body.scrollWidth;
        const badElements = [];

        document.querySelectorAll('*').forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.right > docWidth + 1) {
            badElements.push({
              tag: el.tagName,
              className: (el.className?.toString() || '').slice(0, 70),
              right: Math.round(rect.right),
              excess: Math.round(rect.right - docWidth),
            });
          }
        });

        return {
          docWidth,
          bodyWidth,
          isDescuadrado: bodyWidth > docWidth + 1,
          excessWidth: Math.max(0, bodyWidth - docWidth),
          badCount: badElements.length,
          topBadElements: badElements.slice(0, 8),
        };
      });

      console.log(`[${vp.name}] Página ${p.name.toUpperCase()}:`, {
        anchoPantalla: overflow.docWidth,
        anchoRealBody: overflow.bodyWidth,
        DESCUADRADO: overflow.isDescuadrado ? `❌ SÍ (+${overflow.excessWidth}px exceso)` : '✅ PERFECTO (0px)',
        elementosDesbordando: overflow.badCount,
      });

      if (overflow.topBadElements.length > 0) {
        console.log(`  Top elementos culpables en ${p.name}:`, overflow.topBadElements);
      }

      await page.screenshot({
        path: path.join(screenshotsDir, `${p.name}_${vp.name}.png`),
        fullPage: false,
      });
    }

    await context.close();
  }

  await browser.close();
  previewProcess.kill();
  console.log('\n--- AUDITORÍA PLAYWRIGHT FINALIZADA ---');
}

runLocalAudit().catch(console.error);
