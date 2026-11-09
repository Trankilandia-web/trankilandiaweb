const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

async function auditPortals() {
  console.log('🚀 Levantando vite preview en puerto 4185...');
  const preview = spawn('npx.cmd', ['vite', 'preview', '--port', '4185'], {
    shell: true,
    cwd: path.join(__dirname, '..'),
  });

  // Wait for server to be ready with retries
  let isReady = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://localhost:4185/');
      if (res.ok) {
        isReady = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log('Servidor listo:', isReady);

  const screenshotsDir = path.join(__dirname, '..', 'audit_screenshots', 'portals_taste');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Audit Desktop Viewport (1280x800)
    console.log('\n🖥️ --- AUDITORÍA DESKTOP (1280x800) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const desktopPage = await desktopContext.newPage();

    // Login as Admin to get credentials
    await desktopPage.goto('http://localhost:4185/', { waitUntil: 'domcontentloaded' });
    // Simulate Marisol Flores admin login via localStorage
    const setAuth = async (page) => {
      await page.goto('http://localhost:4185/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        const mockUser = {
          id: 'user-marisol-admin',
          email: 'marisolflores@gmail.com', // Recognized SUPER_ADMIN
          user_metadata: {
            full_name: 'Marisol Flores',
            avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
            role: 'admin',
          },
        };
        localStorage.setItem('trankilandia_auth_user', JSON.stringify(mockUser));
        localStorage.setItem('trankilandia_active_role', 'admin');
      });
    };

    await setAuth(desktopPage);

    // Test /cliente
    console.log('📸 Capturando /cliente en desktop...');
    await desktopPage.goto('http://localhost:4185/cliente', { waitUntil: 'domcontentloaded' });
    await desktopPage.waitForTimeout(800);

    // Click "Simular otro Socio (Admin)" to view an authentic member with membership
    const simularBtn = desktopPage.locator('button:has-text("Simular otro Socio")');
    if (await simularBtn.count() > 0) {
      await simularBtn.click();
      await desktopPage.waitForTimeout(400);
      // Click first member in the simulator grid
      const firstMemberBtn = desktopPage.locator('div.grid button').first();
      if (await firstMemberBtn.count() > 0) {
        await firstMemberBtn.click();
        await desktopPage.waitForTimeout(600);
      }
    }

    await desktopPage.screenshot({ path: path.join(screenshotsDir, 'desktop_cliente_carnet.png') });

    // Test switching tabs on /cliente: Mi Rutina
    const rutinaTab = desktopPage.locator('button:has-text("Mi Rutina")');
    if (await rutinaTab.count() > 0) {
      await rutinaTab.click();
      await desktopPage.waitForTimeout(500);
      await desktopPage.screenshot({ path: path.join(screenshotsDir, 'desktop_cliente_rutina.png') });
    }

    // Test switching tabs on /cliente: Mi Membresía
    const membresiaTab = desktopPage.locator('button:has-text("Mi Membresía")');
    if (await membresiaTab.count() > 0) {
      await membresiaTab.click();
      await desktopPage.waitForTimeout(500);
      await desktopPage.screenshot({ path: path.join(screenshotsDir, 'desktop_cliente_membresia.png') });
    }

    // Test /caja
    console.log('📸 Capturando /caja en desktop...');
    await desktopPage.goto('http://localhost:4185/caja', { waitUntil: 'domcontentloaded' });
    await desktopPage.waitForTimeout(800);
    await desktopPage.screenshot({ path: path.join(screenshotsDir, 'desktop_caja_acceso.png') });

    // Test /admin
    console.log('📸 Capturando /admin en desktop...');
    await desktopPage.goto('http://localhost:4185/admin', { waitUntil: 'domcontentloaded' });
    await desktopPage.waitForTimeout(800);
    await desktopPage.screenshot({ path: path.join(screenshotsDir, 'desktop_admin_metricas.png') });

    // 2. Audit Mobile Viewport (iPhone 14 - 390x844)
    console.log('\n📱 --- AUDITORÍA MÓVIL (390x844 - iPhone 14) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();

    // Copy auth state
    await setAuth(mobilePage);

    const mobilePortals = ['/cliente', '/caja', '/admin'];
    for (const p of mobilePortals) {
      await mobilePage.goto(`http://localhost:4185${p}`, { waitUntil: 'domcontentloaded' });
      await mobilePage.waitForTimeout(600);

      const metrics = await mobilePage.evaluate(() => {
        const docW = document.documentElement.clientWidth;
        const bodyW = document.body.scrollWidth;
        return { docW, bodyW, hasOverflow: bodyW > docW + 1 };
      });

      console.log(`Portales móviles: ${p} -> Viewport: ${metrics.docW}px, Scroll: ${metrics.bodyW}px -> ${metrics.hasOverflow ? '❌ OVERFLOW' : '✅ 0px OVERFLOW'}`);
      await mobilePage.screenshot({ path: path.join(screenshotsDir, `mobile_${p.replace('/', '')}.png`) });
    }

    console.log('\n✅ Auditoría visual completada con éxito.');
  } finally {
    await browser.close();
    preview.kill();
  }
}

auditPortals().catch((err) => {
  console.error('Error en auditoría:', err);
  process.exit(1);
});
