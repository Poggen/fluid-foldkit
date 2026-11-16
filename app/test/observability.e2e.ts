import { expect, test } from '@playwright/test'

test('normal hosting keeps diagnostic tracing disabled', async ({ page }) => {
  const collectorRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).port === '5491') collectorRequests.push(request.url())
  })
  await page.goto('/')
  await expect(page.locator('[data-live-previews=true]')).toBeVisible()
  expect(await page.evaluate(() => window.__showcaseTracing)).toBeUndefined()
  await page.getByRole('textbox', { name: 'Try the message composer', exact: true }).fill('hello')
  await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeEnabled()
  expect(collectorRequests).toEqual([])
})
