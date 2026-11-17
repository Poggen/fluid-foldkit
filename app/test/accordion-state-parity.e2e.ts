import { expect, test } from '@playwright/test'

test('an expanded Accordion keeps its tint while a closed row is hovered', async ({ page }) => {
  await page.goto('/components/accordion')
  const root = page.locator('[data-fluid-accordion]').first()
  const open = root.locator('[data-accordion-trigger]').first()
  await expect(open).toHaveAttribute('aria-expanded', 'true')
  await root.getByRole('button', { name: 'How does fluid hover work?', exact: true }).hover()
  await expect
    .poll(() =>
      root.evaluate((element) => {
        const fill = Array.from(element.querySelectorAll('div')).find((node) =>
          node.classList.contains('bg-accent/20'),
        )
        return fill === undefined ? null : getComputedStyle(fill).opacity
      }),
    )
    .toBe('1')
})
