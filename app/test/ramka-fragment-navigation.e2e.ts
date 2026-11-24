import { expect, test } from '@playwright/test'

test.use({ locale: 'sv-SE' })

test('all eight example links scroll by mouse or keyboard without losing query or history', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.goto('/ramka/lightbox?theme=light')
  const document = await page.evaluateHandle(() => window.document)
  const language = await page.locator('html').getAttribute('lang')
  const index = page.getByRole('navigation', { name: 'Ramka example index' })
  const links = index.getByRole('link')
  await expect(links).toHaveCount(8)
  const hashes = await links.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('href') ?? ''),
  )
  const lastHash = hashes.at(-1)
  const previousHash = hashes.at(-2)
  if (lastHash === undefined || previousHash === undefined)
    throw new Error('Expected the final two example links')
  const initialHistory = await page.evaluate(() => history.length)

  for (const [position, hash] of hashes.entries()) {
    const link = links.nth(position)
    await link.scrollIntoViewIfNeeded()
    if (position % 2 === 0) await link.click()
    else {
      await link.focus()
      await page.keyboard.press('Enter')
    }
    await expect(page).toHaveURL(`/ramka/lightbox?theme=light${hash}`)
    await expect(page.locator(hash)).toBeInViewport()
    await expect
      .poll(() =>
        page.locator(hash).evaluate((element) => Math.abs(element.getBoundingClientRect().y)),
      )
      .toBeLessThan(1)
  }
  await expect.poll(() => page.evaluate(() => history.length)).toBe(initialHistory + 8)
  expect(await page.evaluate((previous) => window.document === previous, document)).toBe(true)
  expect(await page.locator('html').getAttribute('lang')).toBe(language)
  expect(await page.evaluate(() => navigator.language)).toBe('sv-SE')
  await expect(page.locator('.reference-contract').first()).toBeAttached()

  await links.last().scrollIntoViewIfNeeded()
  await links.last().focus()
  await page.keyboard.press('Enter')
  await expect(page.locator(lastHash)).toBeInViewport()
  expect(await page.evaluate(() => history.length)).toBe(initialHistory + 8)
  await page.keyboard.press('Tab')
  expect(
    await page.locator(lastHash).evaluate((element) => {
      const focused = window.document.activeElement
      return (
        focused !== null &&
        (element.compareDocumentPosition(focused) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
      )
    }),
  ).toBe(true)
  await page.goBack()
  await expect(page).toHaveURL(`/ramka/lightbox?theme=light${previousHash}`)
  await page.goForward()
  await expect(page).toHaveURL(`/ramka/lightbox?theme=light${lastHash}`)
})

test('modified example activation bypasses SPA navigation', async ({ page }) => {
  await page.goto('/ramka/lightbox?theme=light')
  const link = page
    .getByRole('navigation', { name: 'Ramka example index' })
    .getByRole('link', { name: 'Film trailers', exact: true })
  await link.evaluate((element) => {
    window.addEventListener(
      'click',
      (event) => {
        element.setAttribute('data-navigation-prevented', String(event.defaultPrevented))
        element.setAttribute('data-navigation-modified', String(event.metaKey || event.ctrlKey))
      },
      { once: true },
    )
  })
  await link.click({ modifiers: ['ControlOrMeta'] })
  await expect(link).toHaveAttribute('data-navigation-prevented', 'false')
  await expect(link).toHaveAttribute('data-navigation-modified', 'true')
  await expect(page).toHaveURL('/ramka/lightbox?theme=light')
})
