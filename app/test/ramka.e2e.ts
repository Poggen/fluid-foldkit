import { expect, test } from '@playwright/test'

test('opens Ramka from its reference page and releases the dialog before navigation', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/ramka/lightbox')
  await expect(page.getByRole('heading', { name: 'Ramka Lightbox', level: 1 })).toBeVisible()
  const trigger = page.getByRole('button', { name: 'Open image 1', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Ramka image gallery' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[data-ramka-caption]')).toHaveText('Purple landscape')
  await expect(page.locator('html')).not.toHaveAttribute('data-ramka-view-transition')
  await dialog.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(dialog.locator('[data-ramka-caption]')).toHaveText('Green landscape')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.locator('html')).not.toHaveAttribute('data-ramka-view-transition')
  await expect(page.getByRole('button', { name: 'Open image 2', exact: true })).toBeFocused()
  await page
    .locator('#site-navigation')
    .getByRole('link', { name: 'Installation', exact: true })
    .click()
  await expect(page.getByRole('heading', { name: 'Make yourself at home.' })).toBeVisible()
  await expect(page.locator('[data-ramka-content][open]')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('wheel scrolling the desktop sidebar reveals the Ramka page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 800 })
  await page.goto('/installation')
  const sidebar = page.locator('#site-navigation')
  const ramka = sidebar.getByRole('link', { name: 'Ramka Lightbox', exact: true })
  await expect(sidebar.getByRole('link', { name: 'Installation', exact: true })).toBeVisible()
  await sidebar.hover()
  await page.mouse.wheel(0, 4000)
  await expect(ramka).toBeInViewport()
  await ramka.click()
  await expect(page.getByRole('heading', { name: 'Ramka Lightbox', level: 1 })).toBeVisible()
})

test('Ramka examples exercise gallery, RTL, paging, attachments, video and orbit', async ({
  page,
}) => {
  await page.goto('/ramka/lightbox')
  const demo = (name: string) => page.getByRole('region', { name, exact: true })
  const open = async (name: string, button: string, dialogName = name) => {
    await demo(name).getByRole('button', { name: button, exact: true }).click()
    const dialog = page.getByRole('dialog', { name: dialogName, exact: true })
    await expect(dialog).toBeVisible()
    return dialog
  }
  const close = async (dialog: ReturnType<typeof demo>) => {
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
  }

  const library = await open('Photos app', 'Rocky mountains')
  await library.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(library.locator('[data-ramka-caption]')).toHaveText('Forest canopy')
  await close(library)

  const rtl = await open('Photos app (RTL)', 'جبال صخرية', 'مكتبة الصور')
  await expect(rtl).toHaveAttribute('dir', 'rtl')
  await rtl.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(rtl.locator('[data-ramka-caption]')).toHaveText('أشجار الغابة')
  await close(rtl)

  const grid = demo('Infinite scroll').getByRole('region', { name: 'Scrollable photo grid' })
  await grid.scrollIntoViewIfNeeded()
  await expect(grid.getByRole('button')).toHaveCount(6)
  await grid.hover()
  await page.mouse.wheel(0, 400)
  await expect(grid.getByRole('button', { name: 'Rocky mountains · 7' })).toBeVisible()
  await grid.getByRole('button', { name: 'Rocky mountains · 7' }).click()
  const paged = page.getByRole('dialog', { name: 'Infinite scroll' })
  await expect(paged.locator('[data-ramka-caption]')).toHaveText('Rocky mountains · 7')
  await close(paged)

  const attachments = await open('Text message', 'Forest canopy')
  await expect(attachments.locator('[data-ramka-caption]')).toHaveText('Forest canopy')
  await close(attachments)

  const trailer = await open('Film trailers', '2010 Sintel')
  await expect(trailer.locator('video[controls]')).toBeVisible()
  await trailer.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(trailer.locator('video')).toHaveAttribute('aria-label', 'Big Buck Bunny')
  await close(trailer)

  const stage = await open('3D models', 'Copper cube')
  await stage.getByRole('slider', { name: 'Orbit angle' }).fill('140')
  await expect(stage.getByRole('slider', { name: 'Orbit angle' })).toHaveValue('140')
  await close(stage)
  const cube = demo('3D models').getByRole('button', { name: 'Copper cube', exact: true })
  await expect(cube.locator('[data-orbit-angle]')).toHaveAttribute('data-orbit-angle', '140')
})

test('Ramka distinguishes URL-synced dialogs from standalone photo routes', async ({ page }) => {
  await page.goto('/ramka/lightbox')
  const sync = page.getByRole('region', { name: 'URL-synced state', exact: true })
  await sync.getByRole('button', { name: 'Rocky mountains', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'URL-synced state' })
  await expect(page).toHaveURL(/ramka-photo=mountains/)
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page).toHaveURL(/ramka-photo=trees/)
  await page.goBack()
  await expect(dialog).toBeHidden()
  await page.goForward()
  await expect(dialog.locator('[data-ramka-caption]')).toHaveText('Forest canopy')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  const intercept = page.getByRole('region', { name: 'Intercepted routes', exact: true })
  await intercept.getByRole('button', { name: 'Rocky mountains', exact: true }).click()
  await expect(page).toHaveURL(/ramka-route=mountains/)
  await expect(page.getByRole('dialog', { name: 'Intercepted routes' })).toBeVisible()
  await page.reload()
  await expect(intercept.getByRole('figure')).toBeVisible()
  await expect(intercept.getByRole('img', { name: 'Rocky mountains' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Intercepted routes' })).toBeHidden()
  await intercept.getByRole('link', { name: 'Back to gallery' }).click()
  await expect(
    intercept.getByRole('button', { name: 'Rocky mountains', exact: true }),
  ).toBeVisible()
})
