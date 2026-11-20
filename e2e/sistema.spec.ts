import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context, page }) => {
  // UI tests cannot contact production services or real member accounts.
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  await page.goto('/');
});

test('public navigation reaches the actual pages', async ({ page }) => {
  for (const [name, path] of [['Planes y precios', '/planes'], ['Horarios y clases', '/clases'], ['Instalaciones', '/instalaciones']]) {
    await page.getByRole('link', { name, exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.locator('h1')).toBeVisible();
  }
});

test('login keeps keyboard focus and preserves inputs on connection failure', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Iniciar sesión', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Portal de socios' });
  const identity = dialog.getByLabel('DNI o correo registrado');
  await expect(identity).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await identity.fill('00000001');
  await dialog.getByLabel('Contraseña', { exact: true }).fill('local-test-only');
  await dialog.getByRole('button', { name: 'Ingresar al portal' }).click();
  await expect(dialog.getByRole('alert')).toContainText('no está configurado');
  await expect(identity).toHaveValue('00000001');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test('courtesy pass prepares a request without claiming a reservation', async ({ page }) => {
  await page.getByRole('button', { name: 'Solicitar pase de cortesía', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Solicita tu pase de cortesía' });
  await dialog.getByLabel('Nombre completo').fill('Visita de prueba');
  await dialog.getByLabel('WhatsApp o teléfono').fill('000000000');
  await dialog.getByLabel('Correo electrónico').fill('prueba@example.invalid');
  await dialog.getByRole('button', { name: 'Revisar solicitud' }).click();
  const summary = page.getByRole('dialog', { name: 'Tu solicitud está preparada' });
  await expect(summary).toContainText('Aún no está registrada ni confirmada');
  await expect(summary.getByRole('link', { name: 'Enviar por WhatsApp' })).toHaveAttribute('href', /wa\.me/);
  await summary.getByRole('button', { name: 'Editar solicitud' }).click();
  await expect(page.getByLabel('Nombre completo')).toHaveValue('Visita de prueba');
});

test('mobile navigation and login fit a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Portal de socios' });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('staff terminal requires a server account before PIN access', async ({ page }) => {
  await page.goto('/hub');
  await expect(page.getByLabel('Correo de personal')).toBeVisible();
  await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continuar', exact: true })).toBeVisible();
  await expect(page.getByText('Supabase Conectado', { exact: true })).toHaveCount(0);
  await expect(page.getByText('PIN incorrecto')).toHaveCount(0);
});
