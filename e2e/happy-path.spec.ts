import { unzipSync } from 'fflate'
import { expect, test } from '@playwright/test'
import { buildBookFixture, EDITED_SENTENCE, GERMAN_PASSAGE } from './fixtures/book.ts'

/**
 * Flujo feliz completo del Paso 15 del blueprint: subir → extracción → ajustes → idioma →
 * editor → portada → construir → validar → descargar. Un solo test con `test.step` para que
 * el reporte de Playwright muestre justo en qué paso se rompió, si se rompe.
 */
test('flujo completo: subir, ajustar, confirmar idioma, editar, recortar portada y exportar', async ({ page }) => {
  const pdf = await buildBookFixture()

  await test.step('subir el PDF y llegar a la pantalla de ajustes', async () => {
    await page.goto('/')
    await page.locator('input[type="file"]').setInputFiles({
      name: 'libro-de-prueba.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(pdf),
    })
    await page.waitForURL(/#\/job\//, { timeout: 45_000 })
  })

  await test.step('cambiar un ajuste y ver que el reporte se actualiza', async () => {
    const toggle = page.locator('div.items-start', { hasText: 'Números de página' })
    await toggle.getByRole('switch').click()
    await expect(page.getByText('Aplicando…')).toBeHidden({ timeout: 10_000 })
  })

  await test.step('revisar y confirmar el pasaje en alemán', async () => {
    await page.getByRole('link', { name: /Revisar idioma/ }).click()
    await expect(page).toHaveURL(/\/idioma$/)
    await page.getByRole('button', { name: /Confirmar todo en alemán/ }).click()
    await expect(page.getByText(GERMAN_PASSAGE)).toHaveCount(0)
  })

  await test.step('editar el capítulo directo en la vista central — autoguarda con Ctrl+S', async () => {
    await page.getByRole('link', { name: '← Ajustes' }).click()
    await expect(page).toHaveURL(/\/job\/[^/]+$/)

    const body = page.locator('.tiptap[contenteditable="true"]')
    await body.click()
    await page.keyboard.press('End')
    await page.keyboard.press('Enter')
    await page.keyboard.type(EDITED_SENTENCE)
    await page.keyboard.press('Control+s')

    await expect(page.getByText('Guardando…')).toHaveCount(0, { timeout: 10_000 })
    await expect(page.getByText('Cambios sin guardar')).toHaveCount(0)
    await expect(page.getByText('Editado a mano')).toBeVisible({ timeout: 10_000 })
    await expect(body.getByText(EDITED_SENTENCE)).toBeVisible()
  })

  await test.step('elegir y guardar una portada', async () => {
    await page.getByRole('link', { name: 'Portada' }).click()
    await expect(page).toHaveURL(/\/portada$/)
    await page.locator('button:has(img)').first().click()
    await page.getByRole('button', { name: 'Guardar portada' }).click()
    await expect(page.getByRole('heading', { name: 'Vista previa' })).toBeVisible({ timeout: 15_000 })
  })

  const download = await test.step('construir el EPUB, validar y descargar', async () => {
    await page.getByRole('link', { name: '← Ajustes' }).click()
    await expect(page).toHaveURL(/\/job\/[^/]+$/)
    await page.getByRole('link', { name: 'Exportar' }).click()
    await expect(page).toHaveURL(/\/exportar$/)
    await page.getByRole('button', { name: 'Construir EPUB' }).click()
    await expect(page.getByText('Pasó las ocho comprobaciones sin errores ni avisos.')).toBeVisible({ timeout: 20_000 })

    const [downloadEvent] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('link', { name: 'Descargar EPUB' }).click(),
    ])
    return downloadEvent
  })

  await test.step('comprobar el .epub descargado', async () => {
    const path = await download.path()
    if (!path) throw new Error('la descarga no generó un archivo en disco')
    const bytes = await unzipSync(await import('node:fs/promises').then((fs) => fs.readFile(path)))
    expect(Object.keys(bytes)).toContain('mimetype')
    expect(new TextDecoder().decode(bytes['mimetype'])).toBe('application/epub+zip')

    const xhtmlEntry = Object.entries(bytes).find(([name]) => name.endsWith('.xhtml'))
    expect(xhtmlEntry).toBeDefined()

    // La corrección manual del paso anterior tiene que estar en el .epub final — no solo en pantalla.
    const chapterXhtml = Object.entries(bytes)
      .filter(([name]) => name.endsWith('.xhtml') && name.includes('chapter'))
      .map(([, data]) => new TextDecoder().decode(data))
      .join('\n')
    expect(chapterXhtml).toContain(EDITED_SENTENCE)
  })
})
