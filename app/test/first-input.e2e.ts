import { expect, test, type Page } from '@playwright/test'

const holdModules = async (page: Page) => {
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() === 'script') await held
    await route.continue()
  })
  return release
}

for (const activation of ['mouse', 'keyboard'] as const) {
  test(`first-painted Radius retains its ${activation} activation while modules are blocked`, async ({
    page,
  }) => {
    const release = await holdModules(page)
    try {
      await page.goto('/', { waitUntil: 'commit' })
      await expect
        .poll(() =>
          page.evaluate(() => performance.getEntriesByName('first-contentful-paint').length),
        )
        .toBe(1)
      const radius = page.locator('#site-customizer').getByRole('combobox', { name: 'Radius' })
      await expect(radius).toBeVisible()
      const box = await radius.boundingBox()
      if (box === null) throw new Error('Radius must be painted before the first input')
      if (activation === 'mouse') {
        const label = radius.locator('span').last()
        const labelBox = await label.boundingBox()
        if (labelBox === null) throw new Error('Radius label must be painted')
        await page.keyboard.down('Shift')
        await page.mouse.click(labelBox.x + labelBox.width / 2, labelBox.y + labelBox.height / 2)
        await page.keyboard.up('Shift')
        await expect(page.locator('html')).not.toHaveAttribute('data-showcase-input-pending')
        await page.mouse.click(labelBox.x + labelBox.width / 2, labelBox.y + labelBox.height / 2)
      } else {
        await radius.focus()
        await page.keyboard.press('ArrowDown')
      }
      await expect(page.locator('html')).toHaveAttribute('data-showcase-input-pending', '')
      await expect(radius).toHaveCSS('cursor', 'progress')
      await expect(radius).toHaveCSS('outline-width', '2px')
      await expect(radius).toHaveCSS('outline-style', 'solid')
      if (activation === 'mouse') {
        await test.info().attach('first-paint-radius-pending', {
          body: await page.screenshot(),
          contentType: 'image/png',
        })
      }
      await expect(radius).toHaveAttribute('aria-expanded', 'false')
      release()
      await expect(radius).toHaveAttribute('aria-expanded', 'true')
      await expect(page.locator('html')).not.toHaveAttribute('data-showcase-input-pending')
      await page.getByRole('option', { name: 'Rounded', exact: true }).click()
      await expect(radius).toContainText('Rounded')
      await expect(page).toHaveURL(/shape=rounded/u)
      // Wait for the selection's close animation before starting a separate interaction.
      await expect(page.getByRole('listbox', { name: 'Radius', exact: true })).toBeHidden()
      // The temporary capture listener is gone: subsequent input reaches Foldkit once.
      await radius.click()
      await expect(radius).toHaveAttribute('aria-expanded', 'true')
      await page.keyboard.press('Escape')
      await expect(radius).toHaveAttribute('aria-expanded', 'false')
    } finally {
      release()
    }
  })
}

test('first-painted links retain native navigation while modules are blocked', async ({ page }) => {
  const release = await holdModules(page)
  try {
    await page.goto('/', { waitUntil: 'commit' })
    await page
      .locator('#site-navigation')
      .getByRole('link', { name: 'Button', exact: true })
      .click({
        noWaitAfter: true,
      })
    await expect(page).toHaveURL(/\/components\/button/u)
    await expect(page.locator('html')).not.toHaveAttribute('data-showcase-input-pending')
  } finally {
    release()
  }
})

test.describe('touch startup', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  test('first-painted Pages tap opens navigation after hydration', async ({ page }) => {
    const release = await holdModules(page)
    try {
      await page.goto('/', { waitUntil: 'commit' })
      const pages = page.getByRole('button', { name: 'Pages', exact: true })
      await pages.tap()
      await expect(page.locator('html')).toHaveAttribute('data-showcase-input-pending', '')
      release()
      await expect(page.locator('#navigation-dialog')).toBeVisible()
      await expect(page.locator('#site-menu-button')).toHaveAttribute('aria-expanded', 'true')
    } finally {
      release()
    }
  })
})

for (const cancellation of ['Escape', 'outside pointer', 'outside focus'] as const) {
  test(`first-painted Radius intent is cancelled by ${cancellation}`, async ({ page }) => {
    const release = await holdModules(page)
    try {
      await page.goto('/', { waitUntil: 'commit' })
      await expect
        .poll(() =>
          page.evaluate(() => performance.getEntriesByName('first-contentful-paint').length),
        )
        .toBe(1)
      const radius = page.locator('#site-customizer').getByRole('combobox', { name: 'Radius' })
      const box = await radius.boundingBox()
      if (box === null) throw new Error('Radius must be painted before the first input')
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await expect(page.locator('html')).toHaveAttribute('data-showcase-input-pending', '')
      if (cancellation === 'Escape') await page.keyboard.press('Escape')
      else if (cancellation === 'outside focus') await page.keyboard.press('Tab')
      else await page.mouse.click(700, 100)
      await expect(page.locator('html')).not.toHaveAttribute('data-showcase-input-pending')
      const focused = await page.evaluate(() => document.activeElement?.id)
      release()
      await page.waitForFunction(() => window.__releaseShowcaseInput === undefined)
      await expect(radius).toHaveAttribute('aria-expanded', 'false')
      expect(await page.evaluate(() => document.activeElement?.id)).toBe(focused)
    } finally {
      release()
    }
  })
}

test('the latest first-painted control replaces an earlier intent', async ({ page }) => {
  const release = await holdModules(page)
  try {
    await page.goto('/', { waitUntil: 'commit' })
    const customizer = page.locator('#site-customizer')
    const radius = customizer.getByRole('combobox', { name: 'Radius' })
    const theme = customizer.getByRole('combobox', { name: 'Theme' })
    for (const control of [radius, theme]) {
      const box = await control.boundingBox()
      if (box === null) throw new Error('Preference must be visible before its input')
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
      await expect(page.locator('html')).toHaveAttribute('data-showcase-input-pending', '')
    }
    release()
    await expect(theme).toHaveAttribute('aria-expanded', 'true')
    await expect(radius).toHaveAttribute('aria-expanded', 'false')
  } finally {
    release()
  }
})
