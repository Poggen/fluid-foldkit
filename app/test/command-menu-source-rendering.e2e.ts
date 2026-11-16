import { expect, test } from '@playwright/test'

for (const size of ['default', 'compact']) {
  test(`command menu focus, baseline clearance and dividers at ${size} density`, async ({
    page,
  }) => {
    await page.goto(`/components/command-menu?size=${size}`)
    await page.evaluate(() => document.fonts.ready)
    const preview = page.locator('.reference-preview')
    const input = preview.locator('input[role="combobox"]')
    const icon = input.locator('..').locator('svg')
    await expect(preview.getByRole('tablist', { name: 'Filter results' })).toBeVisible()

    await input.evaluate((node) => node.blur())
    await expect(icon).toHaveCSS('stroke-width', '1.5px')
    const blurredColor = await icon.evaluate((node) => getComputedStyle(node).color)
    await input.focus()
    await expect(input).toBeFocused()
    await expect(icon).toHaveCSS('stroke-width', '2px')
    await expect
      .poll(() => icon.evaluate((node) => getComputedStyle(node).color))
      .not.toBe(blurredColor)
    await expect(icon).toHaveCSS(
      'color',
      await input.evaluate((node) => getComputedStyle(node).color),
    )
    await expect(icon).toHaveCSS('transition-property', 'color, stroke-width')

    const row = preview.locator('[data-command-value="search"]')
    const label = row.getByText('Search everywhere', { exact: true })
    const description = row.getByText('Files, people, messages', { exact: true })
    await expect(label.locator('..')).toHaveCSS('align-items', 'baseline')
    await expect(label.locator('..')).toHaveCSS('column-gap', '8px')
    for (const text of [label, description]) {
      await expect(text).toHaveCSS('padding-top', '4px')
      await expect(text).toHaveCSS('padding-bottom', '4px')
      await expect(text).toHaveCSS('margin-top', '-4px')
      await expect(text).toHaveCSS('margin-bottom', '-4px')
      await expect(text).toHaveCSS('overflow-x', 'hidden')
    }
    const geometry = await row.evaluate((element) => {
      const label = Array.from(element.querySelectorAll('span')).find(
        (node) => node.textContent === 'Search everywhere',
      )
      const description = Array.from(element.querySelectorAll('span')).find(
        (node) => node.textContent === 'Files, people, messages',
      )
      if (label === undefined || description === undefined) throw new Error('Missing row text')
      const row = element.getBoundingClientRect()
      const first = label.getBoundingClientRect()
      const second = description.getBoundingClientRect()
      return {
        sharedTextParent: label.parentElement === description.parentElement,
        baselineBottomDifference: Math.abs(first.bottom - second.bottom),
        clearanceTop: Math.min(first.top, second.top) - row.top,
        clearanceBottom: row.bottom - Math.max(first.bottom, second.bottom),
      }
    })
    expect(geometry.sharedTextParent).toBe(true)
    expect(geometry.baselineBottomDifference).toBeLessThanOrEqual(1)
    expect(geometry.clearanceTop).toBeGreaterThanOrEqual(-0.5)
    expect(geometry.clearanceBottom).toBeGreaterThanOrEqual(-0.5)

    const scroll = preview
      .locator('[data-slot="scroll-area"]')
      .filter({ has: page.locator('[data-command-value="search"]') })
    await expect
      .poll(() => scroll.evaluate((node) => getComputedStyle(node, '::before').top))
      .toBe('-1px')
    const props = page.getByRole('complementary', { name: 'CommandMenu props' })
    await props.getByRole('switch', { name: 'Footer hints', exact: true }).click()
    await expect.poll(() => scroll.evaluate((node) => node.nextElementSibling === null)).toBe(true)
    await expect
      .poll(() => scroll.evaluate((node) => getComputedStyle(node, '::after').display))
      .toBe('none')
    await props.getByRole('switch', { name: 'Footer hints', exact: true }).click()
    await expect
      .poll(() => scroll.evaluate((node) => getComputedStyle(node, '::after').display))
      .not.toBe('none')
  })
}
