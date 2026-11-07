const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runAudit() {
  const browser = await chromium.launch({ headless: true });
  const screenshotsDir = path.join(__dirname, '..', 'audit_screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  // Mobile device: iPhone 13 / 14 viewport (390 x 844)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();
  const baseUrl = 'https://trankilandia-gym.vercel.app';

  const routes = [
    { name: 'home_mobile', url: '/' },
    { name: 'planes_mobile', url: '/planes' },
    { name: 'clases_mobile', url: '/clases' },
    { name: 'instalaciones_mobile', url: '/instalaciones' },
  ];

  console.log('--- AUDITORÍA MÓVIL PLAYWRIGHT ---');

  for (const r of routes) {
    try {
      console.log(`Auditing ${r.name}: ${baseUrl}${r.url}`);
      await page.goto(`${baseUrl}${r.url}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(1000);

      // Check horizontal overflow (causes "descuadrado" on mobile)
      const overflow = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const bodyWidth = document.body.scrollWidth;
        const overflowingElements = [];

        document.querySelectorAll('*').forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.right > docWidth + 2) {
            overflowingElements.push({
              tag: el.tagName,
              className: el.className?.toString().slice(0, 80),
              id: el.id,
              right: rect.right,
              docWidth,
            });
          }
        });

        return {
          docWidth,
          bodyWidth,
          hasHorizontalScroll: bodyWidth > docWidth + 2,
          overflowCount: overflowingElements.length,
          overflowingElements: overflowingElements.slice(0, 10),
        };
      });

      console.log(`Results for ${r.name}:`, JSON.stringify(overflow, null, 2));

      await page.screenshot({
        path: path.join(screenshotsDir, `${r.name}.png`),
        fullPage: false,
      });
    } catch (err) {
      console.error(`Error on ${r.name}:`, err.message);
    }
  }

  // Audit Login Modal on Mobile
  try {
    console.log('Auditing Login Modal on Mobile...');
    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 15000 });
    // Click login button in navbar or floating pass badge
    const loginBtn = await page.$('button:has-text("Ingresar"), button:has-text("Iniciar"), a:has-text("Ingresar")');
    if (loginBtn) {
      await loginBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(screenshotsDir, 'login_modal_mobile.png'),
      });
      console.log('Login modal screenshot saved.');
    }
  } catch (err) {
    console.error('Error auditing login modal:', err.message);
  }

  await browser.close();
  console.log('Audit complete. Screenshots saved to:', screenshotsDir);
}

runAudit().catch(console.error);
