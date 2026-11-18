import { expect, test } from '@playwright/test'

test('the homepage loads the documentation bundle on the first component visit', async ({
  page,
}) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (/\/assets\/documentation-implementation-[^/]+\.js$/u.test(request.url())) {
      requests.push(request.url())
    }
  })

  await page.goto('/')
  const radius = page.locator('#customize-desktop-shape-select-trigger')
  await radius.click()
  await expect(radius).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  expect(requests).toHaveLength(0)

  await page.locator('#site-navigation').getByRole('link', { name: 'Card', exact: true }).click()
  await expect(page.locator('[data-reference-page="fluid/card"]')).toBeVisible()
  expect(requests).toHaveLength(1)
  await page.goBack()
  await expect(radius).toBeVisible()
  await page.goForward()
  await expect(page.locator('[data-reference-page="fluid/card"]')).toBeVisible()
  expect(requests).toHaveLength(1)
})

test('a failed direct documentation chunk preserves navigation and offers explicit reload', async ({
  page,
}) => {
  const chunk = '**/assets/documentation-implementation-*.js'
  await page.route(chunk, (route) => route.abort('failed'))
  await page.goto('/components/card')
  const notice = page.getByRole('alert').filter({ hasText: 'Interactive controls could not load' })
  await expect(notice).toBeVisible()
  await expect(page.locator('html')).not.toHaveAttribute('data-showcase-input-pending')
  expect(await page.evaluate(() => window.__releaseShowcaseInput === undefined)).toBe(true)
  await expect(
    page.locator('#site-navigation').getByRole('link', { name: 'Card', exact: true }),
  ).toHaveAttribute('href', /\/components\/card/u)
  await page.unroute(chunk)
  await notice.getByRole('button', { name: 'Reload page' }).click()
  await expect(notice).toHaveCount(0)
  const radius = page.locator('#customize-desktop-shape-select-trigger')
  await radius.click()
  await expect(radius).toHaveAttribute('aria-expanded', 'true')
})
