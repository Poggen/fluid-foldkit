import { expect, test } from '@playwright/test'
import { admitAllPreviews } from './fixtures/gallery-admission'

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`returning to the gallery re-admits visible bodies with fresh page drafts at ${viewport.width}px`, async ({
    page,
  }) => {
    test.setTimeout(120000)
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
    await admitAllPreviews(page)

    const inputCard = page.locator('[data-component="fluid/input"]')
    await inputCard.scrollIntoViewIfNeeded()
    const input = inputCard.getByRole('textbox').first()
    await input.fill('Keep this draft after admission resets')

    const accordion = page.locator('[data-component="fluid/accordion"]')
    await accordion.scrollIntoViewIfNeeded()
    const trigger = accordion.getByRole('button', {
      name: 'How does fluid hover work?',
      exact: true,
    })
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await inputCard.getByRole('link', { name: 'View Input documentation', exact: true }).click()
    await expect(page.locator('[data-reference-page]')).toHaveAttribute(
      'data-reference-page',
      'fluid/input',
    )
    if (viewport.width < 1280) await page.locator('#site-menu-button').click()
    await page.getByRole('link', { name: 'Showcase', exact: true }).click()
    await expect(page.locator('[data-live-previews="true"]')).toBeVisible()

    const farChart = page.locator('[data-component="charts/bar-skeleton"]')
    await expect(farChart).toHaveAttribute('data-deferred', 'true')
    await expect(farChart.getByRole('img', { name: 'Loading chart' })).toHaveCount(0)

    await inputCard.scrollIntoViewIfNeeded()
    await expect(inputCard).toHaveAttribute('data-deferred', 'false')
    await expect(input).toHaveValue('')
    await accordion.scrollIntoViewIfNeeded()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await farChart.scrollIntoViewIfNeeded()
    await expect(farChart).toHaveAttribute('data-deferred', 'false')
    await expect(farChart.getByRole('img', { name: 'Loading chart' })).toBeVisible()
  })
}
