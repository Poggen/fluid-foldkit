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

test('uses the upstream photo library, RTL navigation and progressive feed', async ({ page }) => {
  await page.goto('/ramka/lightbox')
  const library = page.getByRole('region', { name: 'Photos app', exact: true })
  await expect(library.getByText('48 Photos · July 2024')).toBeVisible()
  await library.getByRole('button', { name: 'Larger photos' }).click()
  await expect(library.locator('.grid.gap-0\\.5')).toHaveCSS(
    'grid-template-columns',
    /^(?:[\d.]+px ){3}[\d.]+px$/,
  )
  await library.getByRole('button', { name: 'Photo 1', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Library photos' })
  await dialog.focus()
  await page.keyboard.press('ArrowRight')
  await expect(dialog.locator('[data-ramka-item][data-active] img')).toHaveAttribute(
    'alt',
    'Photo 2',
  )
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  const rtl = page.getByRole('region', { name: 'Photos app (RTL)', exact: true })
  await rtl.getByRole('button', { name: 'Photo 1', exact: true }).click()
  await expect(dialog).toHaveAttribute('dir', 'rtl')
  await dialog.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(dialog.locator('[data-ramka-item][data-active] img')).toHaveAttribute(
    'alt',
    'Photo 2',
  )
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  const feed = page.getByRole('region', { name: 'Infinite scroll', exact: true })
  const last = feed.getByRole('button', { name: 'Feed photo 12', exact: true })
  await last.click()
  const feedViewer = page.getByRole('dialog', { name: 'Feed photos' })
  await expect(feedViewer.getByRole('button', { name: 'Next photo' })).toBeEnabled()
  await feedViewer.getByRole('button', { name: 'Next photo' }).click()
  await expect(feedViewer.locator('[data-ramka-item][data-active] img')).toHaveAttribute(
    'alt',
    'Feed photo 13',
  )
})

test('opens the upstream attachment stack and a poster as independent galleries', async ({
  page,
}) => {
  await page.goto('/ramka/lightbox')
  await page.locator('#text-message').getByRole('button', { name: 'Open 3 attachments' }).click()
  const attachments = page.getByRole('dialog', { name: 'Message attachments' })
  await expect(attachments.getByRole('tablist', { name: 'Photo thumbnails' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(attachments).toBeHidden()

  await page
    .locator('#film-trailers')
    .locator('[data-ramka-trigger]')
    .filter({ has: page.getByText('Big Buck Bunny', { exact: true }) })
    .click()
  const video = page.getByRole('dialog', { name: 'Big Buck Bunny' }).locator('video[controls]')
  await expect(video).toBeVisible()
  await expect(video).toHaveAttribute('src', /trailer_iphone[.]m4v/)
})

test('Ramka distinguishes URL-synced dialogs from intercepted photos on reload', async ({
  page,
}) => {
  await page.goto('/ramka/lightbox')
  const sync = page.getByRole('region', { name: 'URL-synced state', exact: true })
  await sync.getByRole('button', { name: 'Foggy pine ridge at dawn', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Gallery photos' })
  await expect(page).toHaveURL(/ramka-photo=1/)
  await expect(dialog).toBeVisible()
  await dialog.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/ramka-photo=2/)
  await page.goBack()
  await expect(dialog).toBeHidden()
  await page.goForward()
  await expect(dialog.locator('[data-ramka-caption]')).toHaveText('Open road')
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()

  const intercept = page.getByRole('region', { name: 'Intercepted routes', exact: true })
  await intercept.getByRole('link', { name: 'Foggy pine ridge at dawn', exact: true }).click()
  await expect(page).toHaveURL(/ramka-route=1/)
  await expect(dialog).toBeVisible()
  await page.reload()
  await expect(intercept.getByRole('figure')).toBeInViewport()
  await expect(intercept.getByRole('img', { name: 'Foggy pine ridge at dawn' })).toBeVisible()
  await expect(dialog).toBeHidden()
  await intercept.getByRole('link', { name: '← Back to the gallery' }).click()
  await expect(
    intercept.getByRole('link', { name: 'Foggy pine ridge at dawn', exact: true }),
  ).toBeVisible()
})
