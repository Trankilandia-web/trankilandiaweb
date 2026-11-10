import { test, expect } from '@playwright/test';

test.describe('Pruebas de Sistema E2E · Trankilandia Gym', () => {
  test.beforeEach(async ({ page }) => {
    // Limpiar almacenamiento antes de cada prueba para garantizar estado limpio y aislado
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  test('Flujo 1: Un socio registrado ingresa con su DNI y accede DIRECTAMENTE a su Carnet Digital sin formularios redundantes', async ({ page }) => {
    await page.goto('/');

    // 1. Abrir modal de inicio de sesión
    const btnIniciarSesion = page.getByRole('button', { name: /INICIAR SESIÓN/i }).first();
    await expect(btnIniciarSesion).toBeVisible();
    await btnIniciarSesion.click();

    // 2. Ingresar credenciales del socio oficial Betty Romero Gavilan (DNI 46410051)
    const inputDni = page.locator('#login-dni');
    await expect(inputDni).toBeVisible();
    await inputDni.fill('46410051');

    const inputPw = page.locator('#login-password');
    await inputPw.fill('46410051');

    // 3. Enviar formulario
    const btnIngresar = page.getByRole('button', { name: /INGRESAR AL PORTAL/i });
    await btnIngresar.click();

    // 4. Esperar redirección al Portal del Socio
    await page.waitForURL('**/cliente');

    // 5. VALIDACIÓN CRÍTICA: NO debe aparecer el formulario redundante "Genera tu Tarjeta de Ingreso"
    const formRedundante = page.getByText(/Genera tu Tarjeta de Ingreso/i);
    await expect(formRedundante).not.toBeVisible({ timeout: 5000 });

    // 6. El carnet oficial debe estar visible con su nombre, DNI y QR
    await expect(page.getByText(/Betty Romero Gavilan/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/46410051/).first()).toBeVisible();
  });

  test('Flujo 2: Un DNI no registrado muestra la tarjeta de orientación con WhatsApp sin formularios engañosos', async ({ page }) => {
    await page.goto('/');

    // Abrir login
    await page.getByRole('button', { name: /INICIAR SESIÓN/i }).first().click();

    // Ingresar DNI inexistente
    await page.locator('#login-dni').fill('99999999');
    await page.locator('#login-password').fill('99999999');
    await page.getByRole('button', { name: /INGRESAR AL PORTAL/i }).click();

    await page.waitForURL('**/cliente');

    // Debe mostrar la tarjeta clara de DNI no registrado
    await expect(page.getByText(/DNI no registrado en el Padrón/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/99999999/)).toBeVisible();
    await expect(page.getByRole('link', { name: /Consultar por WhatsApp/i })).toBeVisible();
  });

  test('Flujo 3: Módulo de Recepción (Caja) opera en vivo con buscador rápido de atletas', async ({ page }) => {
    // Iniciar como administradora Marisol Flores
    await page.goto('/');
    await page.getByRole('button', { name: /INICIAR SESIÓN/i }).first().click();

    // Clic en botón de acceso rápido Marisol Flores
    const btnMarisol = page.getByRole('button', { name: /Marisol Flores/i });
    await expect(btnMarisol).toBeVisible();
    await btnMarisol.click();

    // Navegar directamente a la terminal de Caja
    await page.goto('/caja');

    // Validar encabezado de recepción
    await expect(page.getByText(/Recepción & Caja/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/1\. MARCAR INGRESO/i)).toBeVisible();

    // Validar buscador rápido de atletas
    const searchInput = page.getByPlaceholder(/ESCANEA EL CARNET O ESCRIBE DNI/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Betty Romero Gavilan');
    await searchInput.press('Enter');

    // Debe mostrar la tarjeta de estado con el nombre del atleta
    await expect(page.getByText(/Betty Romero Gavilan/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Flujo 4: Módulo de Administración muestra el Padrón Oficial con exactamente 417 socios', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /INICIAR SESIÓN/i }).first().click();

    // Clic en botón de acceso rápido Luis Lloclla
    const btnLuis = page.getByRole('button', { name: /Luis Lloclla/i });
    await expect(btnLuis).toBeVisible();
    await btnLuis.click();

    // Navegar al Admin Dashboard
    await page.goto('/admin');

    // Validar encabezado del administrador
    await expect(page.getByText(/Control de Recaudación, Padrón de Socios y Tarifas Oficiales/i)).toBeVisible({ timeout: 8000 });

    // Validar que el padrón indica los 417 socios oficiales
    await expect(page.getByText(/Padrón \(417\)/i).first()).toBeVisible({ timeout: 8000 });

    // Validar secciones de control de tarifas
    const btnTarifas = page.getByRole('button', { name: /Planes & Tarifas/i });
    await expect(btnTarifas).toBeVisible();
    await btnTarifas.click();
    await expect(page.getByText(/Planes de Membresía & Tarifas Oficiales/i)).toBeVisible();
  });
});
