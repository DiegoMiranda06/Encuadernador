import { expect, test } from '@playwright/test'
import { buildBookFixture, CHAPTER_1_BODY } from './fixtures/book.ts'

/**
 * Prueba mínima: confirma que el worker, el WASM de mupdf.js e IndexedDB funcionan juntos
 * contra el build real de producción (pnpm preview), antes de intentar el flujo completo.
 */
test('sube un PDF y ve la vista previa del primer capítulo', async ({ page }) => {
  const pdf = await buildBookFixture()

  await page.goto('/')
  await expect(page.getByText('PDF → EPUB, 100% en el navegador.')).toBeVisible()

  await page.locator('input[type="file"]').setInputFiles({
    name: 'libro-de-prueba.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(pdf),
  })

  await page.waitForURL(/#\/job\//, { timeout: 45_000 })

  await expect(page.getByText(CHAPTER_1_BODY)).toBeVisible({ timeout: 15_000 })
})
