import { expect, test } from '@playwright/test'

for (const route of ['/components/thinking-steps', '/fluid/thinking.html']) {
  test(`Thinking image loads with its original caption at ${route}`, async ({ page }) => {
    await page.goto(route)
    const example = page.getByRole('region', { name: 'With Images', exact: true })
    await example.scrollIntoViewIfNeeded()
    const image = example
      .getByText('Homepage screenshot', { exact: true })
      .locator('..')
      .locator('img')
    await expect(image).toBeVisible()
    await expect
      .poll(() =>
        image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
      )
      .toBe(true)
  })
}

test('standalone ChatMessage mounts after loading its portrait', async ({ page }) => {
  await page.goto('/fluid/chat-message.html')
  await expect(page.getByRole('heading', { name: 'ChatMessage', exact: true })).toBeVisible()
  const image = page.locator('img').first()
  await expect
    .poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0))
    .toBe(true)
})

test('every standalone font stylesheet loads its bundled Inter face', async ({ page }) => {
  test.setTimeout(90000)
  const pages = [
    'accordion',
    'ask-user-questions',
    'banner',
    'checkbox-group-forms',
    'dropdown',
    'input-group',
    'input-queue',
    'mobile-drawer',
    'presentation',
    'primitives',
    'reveal',
    'sidebar',
    'sidebar-recipes',
    'slider-ask-forms',
    'switch-forms',
    'tabs-forms',
    'color-scroll',
  ]
  for (const name of pages) {
    await page.goto(`/fluid/${name}.html`)
    const faces = await page.evaluate(async () =>
      (await document.fonts.load('13px Inter')).map((font) => font.status),
    )
    expect(faces.length, name).toBeGreaterThan(0)
    expect(faces, name).toEqual(faces.map(() => 'loaded'))
  }
})
