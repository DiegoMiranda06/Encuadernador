import { expect, test } from '@playwright/test'
import { buildBookFixture, CHAPTER_1_BODY } from './fixtures/book.ts'

/**
 * Antes de pisar una edición manual en silencio, el ajuste que la afectaría se avisa antes de
 * aplicarse (hooks/useGuardedPipeline.ts). Desactivar "División en capítulos" colapsa todo en
 * un único capítulo de respaldo con otra key — huérfano garantizado para cualquier override
 * existente, así que es la forma más confiable de disparar el diálogo en un test.
 */
test('avisa antes de un ajuste que dejaría huérfana una edición manual, y permite cancelar', async ({ page }) => {
  const pdf = await buildBookFixture()
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'libro-de-prueba.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(pdf),
  })
  await page.waitForURL(/#\/job\//, { timeout: 45_000 })

  await test.step('editar el capítulo y esperar el autoguardado', async () => {
    const body = page.locator('.tiptap[contenteditable="true"]')
    await body.click()
    await page.keyboard.press('End')
    await page.keyboard.type(' Corrección manual.')
    await page.keyboard.press('Control+s')
    await expect(page.getByText('Editado a mano')).toBeVisible({ timeout: 10_000 })
  })

  const chaptersToggle = page.locator('div.items-start', { hasText: 'División en capítulos' }).getByRole('switch')

  await test.step('cancelar el aviso no aplica el cambio', async () => {
    await chaptersToggle.click()
    await expect(page.getByText('Este cambio puede afectar una edición manual')).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).click()
    await expect(page.getByText('Este cambio puede afectar una edición manual')).toHaveCount(0)
    // Seguimos en el mismo capítulo editado — nunca se tocó el pipeline.
    await expect(page.getByText('Editado a mano')).toBeVisible()
    await expect(page.getByText(CHAPTER_1_BODY)).toBeVisible()
  })

  await test.step('confirmar el aviso aplica el cambio y reporta el huérfano', async () => {
    await chaptersToggle.click()
    await expect(page.getByText('Este cambio puede afectar una edición manual')).toBeVisible()
    await page.getByRole('button', { name: 'Aplicar de todos modos' }).click()
    await expect(page.getByText(/edición manual guardada ya no corresponde/)).toBeVisible({ timeout: 10_000 })
  })
})
