const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

async function runTest() {
  console.log('🚀 Iniciando servidor de producción para auditoría final...');
  const previewProcess = spawn('npx.cmd', ['vite', 'preview', '--port', '4180'], {
    shell: true,
    cwd: path.join(__dirname, '..'),
  });

  await new Promise((r) => setTimeout(r, 3500));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();

  const results = [];

  // 1. Probar Mobile Overflow en páginas clave
  const routes = ['/', '/planes', '/clases', '/instalaciones'];
  for (const r of routes) {
    await page.goto(`http://localhost:4180${r}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    const metrics = await page.evaluate(() => {
      const docW = document.documentElement.clientWidth;
      const bodyW = document.body.scrollWidth;
      return { docW, bodyW, hasOverflow: bodyW > docW + 1 };
    });

    results.push({
      route: r,
      anchoViewport: metrics.docW,
      anchoScroll: metrics.bodyW,
      descuadrado: metrics.hasOverflow ? '❌ DESCUADRADO' : '✅ PERFECTO (0px)',
    });
  }

  // 2. Probar Modal de Inicio de Sesión
  await page.goto('http://localhost:4180/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // En móvil, abrir el menú hamburguesa
  const hamburger = page.locator('button[aria-label="Abrir menú"]').first();
  if (await hamburger.isVisible()) {
    await hamburger.click();
    await page.waitForTimeout(500);
  }

  // Hacer clic en INICIAR SESIÓN en el menú móvil
  const mobileLoginBtn = page.locator('button:has-text("INICIAR SESIÓN")').last();
  await mobileLoginBtn.click();
  await page.waitForSelector('#login-modal-title', { timeout: 4000 }).catch(() => console.log('Timeout esperando modal'));
  await page.waitForTimeout(500);

  // Verificar que el banner molesto de .env NO exista
  const envBanner = await page.locator('text=Conexión con Supabase').count();
  const marisolQuickBtn = await page.locator('button:has-text("Marisol Flores")').count();
  const luisQuickBtn = await page.locator('button:has-text("Luis Lloclla")').count();

  results.push({
    feature: 'Login Modal Limpio (Sin banner .env)',
    bannerTrashFound: envBanner === 0 ? '✅ LIMPIO (0 basura)' : '❌ DETECTADO BANNER',
    botonMarisol: marisolQuickBtn > 0 ? '✅ PRESENTE' : '❌ FALTA',
    botonLuis: luisQuickBtn > 0 ? '✅ PRESENTE' : '❌ FALTA',
  });

  // Guardar captura de pantalla en móvil
  const screenshotsDir = path.join(__dirname, '..', 'audit_screenshots');
  if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotsDir, 'final_mobile_login.png') });

  // 3. Probar Quick Login de Marisol
  if (marisolQuickBtn > 0) {
    await page.locator('button:has-text("Marisol Flores")').first().click();
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    const cajaVisible = await page.locator('text=Control de Acceso').count();
    const vozBtn = await page.locator('text=VOZ: ACTIVADA').count();
    const scannerPill = await page.locator('text=Modo Escáner Activo').count();

    results.push({
      feature: 'Acceso Rápido Administrador Marisol Flores',
      urlDestino: currentUrl,
      panelCajaAcceso: cajaVisible > 0 ? '✅ ACCESO CORRECTO A CAJA' : '❌ NO ENCONTRADO',
      alertaVozBoton: vozBtn > 0 ? '✅ VOZ ACTIVA DISPONIBLE' : '❌ FALTA BOTON VOZ',
      estadoLector: scannerPill > 0 ? '✅ MODO ESCÁNER ACTIVO (Sin textos falsos)' : '❌ ERROR',
    });

    await page.screenshot({ path: path.join(screenshotsDir, 'final_caja_dashboard_mobile.png') });
  }

  console.log('\n--- RESULTADOS DE AUDITORÍA PLAYWRIGHT ---');
  console.log(JSON.stringify(results, null, 2));

  await browser.close();
  try {
    previewProcess.kill();
  } catch {}
  process.exit(0);
}

runTest().catch((err) => {
  console.error('Error en test:', err);
  process.exit(1);
});
