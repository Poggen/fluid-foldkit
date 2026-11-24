import { expect, test } from '@playwright/test'

test('routed viewers use the body after gallery navigation and browser history', async ({
  page,
}) => {
  await page.goto('/ramka/lightbox')
  const dialog = page.getByRole('dialog', { name: 'Gallery photos', exact: true })
  const sync = page.getByRole('region', { name: 'URL-synced state', exact: true })
  const syncPortal = page.locator(
    'body > [data-ramka-portal][data-ramka-for="ramka-url-synced-state"]',
  )
  await sync.getByRole('button', { name: 'Foggy pine ridge at dawn', exact: true }).click()
  await expect(page).toHaveURL(/ramka-photo=1/)
  await expect(syncPortal).toHaveCount(1)
  await expect(dialog).toBeInViewport({ ratio: 0.9 })
  await page.goBack()
  await expect(dialog).toBeHidden()
  await page.goForward()
  await expect(syncPortal).toHaveCount(1)
  await expect(dialog).toBeInViewport({ ratio: 0.9 })
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).toBeHidden()

  const intercept = page.getByRole('region', { name: 'Intercepted routes', exact: true })
  const interceptedPortal = page.locator(
    'body > [data-ramka-portal][data-ramka-for="ramka-intercepted-routes"]',
  )
  await intercept.getByRole('link', { name: 'Foggy pine ridge at dawn', exact: true }).click()
  await expect(page).toHaveURL(/ramka-route=1/)
  await expect(interceptedPortal).toHaveCount(1)
  await expect(dialog).toBeInViewport({ ratio: 0.9 })
  await page.goBack()
  await expect(dialog).toBeHidden()
  await page.goForward()
  await expect(interceptedPortal).toHaveCount(1)
  await expect(dialog).toBeInViewport({ ratio: 0.9 })
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).toBeHidden()
  await expect(page).not.toHaveURL(/ramka-route=/)
})

test('an initial URL-synced deep link keeps its inline viewer through close and reopen', async ({
  page,
}) => {
  await page.goto('/ramka/lightbox?ramka-photo=2')
  const sync = page.getByRole('region', { name: 'URL-synced state', exact: true })
  const dialog = sync.getByRole('dialog', { name: 'Gallery photos', exact: true })
  const bodyPortal = page.locator(
    'body > [data-ramka-portal][data-ramka-for="ramka-url-synced-state"]',
  )
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[data-ramka-caption]')).toHaveText('Open road')
  await expect(sync.locator('[data-ramka-root]')).toHaveAttribute(
    'data-ramka-container',
    '__inline__',
  )
  await expect(bodyPortal).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).toBeHidden()
  await sync.getByRole('button', { name: 'Foggy pine ridge at dawn', exact: true }).click()
  await expect(dialog).toBeVisible()
  await expect(bodyPortal).toHaveCount(0)
  await expect(sync.locator('[data-ramka-root]')).toHaveAttribute(
    'data-ramka-container',
    '__inline__',
  )
})

test.describe('routed server paint', () => {
  test.use({ javaScriptEnabled: false })

  test('an initial URL-synced photo is rendered inline while an intercepted photo is standalone', async ({
    page,
  }) => {
    await page.goto('/ramka/lightbox?ramka-photo=2')
    const sync = page.getByRole('region', { name: 'URL-synced state', exact: true })
    const dialog = sync.getByRole('dialog', { name: 'Gallery photos', exact: true })
    await expect(dialog).toBeVisible()
    await expect(dialog.locator('[data-ramka-caption]')).toHaveText('Open road')
    await expect(sync.locator('[data-ramka-root]')).toHaveAttribute(
      'data-ramka-container',
      '__inline__',
    )
    await expect(dialog.locator('[data-ssr-active]')).toHaveAttribute('data-index', '1')

    await page.goto('/ramka/lightbox?ramka-route=1')
    const intercept = page.getByRole('region', { name: 'Intercepted routes', exact: true })
    await expect(intercept.getByRole('figure')).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Gallery photos', exact: true })).toHaveCount(0)
  })
})
