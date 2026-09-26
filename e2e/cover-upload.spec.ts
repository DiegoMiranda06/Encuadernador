import { expect, test } from '@playwright/test'
import { buildBookFixture } from './fixtures/book.ts'

// El PNG 1x1 más chico posible que sigue siendo válido — createImageBitmap() lo acepta,
// que es justo lo que hay que probar (un PNG real, no bytes cualquiera).
const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

test('sube una imagen propia como portada, la previsualiza y la guarda', async ({ page }) => {
  const pdf = await buildBookFixture()
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'libro.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(pdf),
  })
  await page.waitForURL(/#\/job\//, { timeout: 45_000 })

  await page.getByRole('link', { name: 'Portada' }).click()
  await expect(page).toHaveURL(/\/portada$/)

  const uploadInput = page.locator('label:has-text("Subir imagen") input[type="file"]')
  await uploadInput.setInputFiles({
    name: 'mia.png',
    mimeType: 'image/png',
    buffer: Buffer.from(TINY_PNG_BASE64, 'base64'),
  })

  // La tarjeta cambia de rótulo — confirma que la candidata subida quedó seleccionada.
  await expect(page.getByText('Reemplazar imagen')).toBeVisible({ timeout: 5_000 })

  await page.getByRole('button', { name: 'Guardar portada' }).click()
  await expect(page.getByRole('heading', { name: 'Vista previa' })).toBeVisible({ timeout: 15_000 })
})
