import { expect, test } from '@playwright/test'
import { buildBookFixture } from './fixtures/book.ts'

test('el panel de ajustes se contrae, se expande, y recuerda la preferencia al recargar', async ({ page }) => {
  const pdf = await buildBookFixture()
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'libro-de-prueba.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(pdf),
  })
  await page.waitForURL(/#\/job\//, { timeout: 45_000 })

  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()

  await page.getByRole('button', { name: 'Contraer ajustes' }).click()
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toHaveCount(0)
  // Los ajustes siguen activos aunque no se vean — el reporte del capítulo sigue disponible.
  await expect(page.getByText('Capítulo uno')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Mostrar ajustes' }).click()
  await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible()
})
