import { expect, test } from '@playwright/test'
import { buildBookFixture, CHAPTER_1_BODY } from './fixtures/book.ts'

/**
 * Paso 13 del blueprint: la app tiene que cargar y procesar un PDF sin conexión tras la
 * primera visita (service worker de vite-plugin-pwa cacheando el bundle y el .wasm de mupdf).
 */
test.use({ serviceWorkers: 'allow' })

test('procesa un PDF sin conexión tras la primera visita', async ({ page, context }) => {
  await page.goto('/')
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    if (!registration.active) throw new Error('el service worker no llegó a estado "active"')
  })

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByText('PDF → EPUB, 100% en el navegador.')).toBeVisible()

  const pdf = await buildBookFixture()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'libro-de-prueba.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(pdf),
  })
  await page.waitForURL(/#\/job\//, { timeout: 45_000 })

  await expect(page.getByText(CHAPTER_1_BODY)).toBeVisible({ timeout: 15_000 })
})
