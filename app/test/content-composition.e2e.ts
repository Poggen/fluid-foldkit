import { expect, test } from '@playwright/test'

test('standalone Card parts inherit live documentation presentation through dismiss and restore', async ({
  page,
}) => {
  await page.goto('/components/card?shape=rounded')
  const promo = page.getByRole('region', { name: 'Fully yours — compose anything', exact: true })
  const start = promo.getByRole('button', { name: 'Get started', exact: true })
  await expect(start).toHaveCSS('font-size', '12px')
  await expect(start).toHaveCSS('border-radius', '8px')
  const customizer = page.locator('#site-customizer')
  await customizer.getByRole('combobox', { name: 'Size', exact: true }).click()
  await page.getByRole('option', { name: 'Compact', exact: true }).click()
  await customizer.getByRole('combobox', { name: 'Radius', exact: true }).click()
  await page.getByRole('option', { name: 'Sharp', exact: true }).click()
  await expect(start).toHaveCSS('font-size', '11px')
  await expect(start).toHaveCSS('border-radius', '1px')
  await promo.locator('[data-slot=card]').hover()
  await promo.getByRole('button', { name: 'Dismiss', exact: true }).click()
  const restore = promo.getByRole('button', { name: 'Restore card', exact: true })
  await expect(restore).toHaveCSS('font-size', '11px')
  await expect(restore).toHaveCSS('border-radius', '1px')
  await restore.click()
  await expect(start).toHaveCSS('font-size', '11px')
  await expect(start).toHaveCSS('border-radius', '1px')
})

test('ThinkingSteps playback remains in its preview header and responds to keyboard activation', async ({
  page,
}) => {
  await page.goto('/components/thinking-steps')
  const streaming = page.getByRole('region', { name: 'Streaming', exact: true })
  const play = streaming
    .locator('.reference-toolbar')
    .getByRole('button', { name: 'Play Streaming', exact: true })
  const pause = streaming
    .locator('.reference-toolbar')
    .getByRole('button', { name: 'Pause Streaming', exact: true })
  await streaming.scrollIntoViewIfNeeded()
  await expect(pause).toBeVisible()
  await expect(pause.locator('svg')).toBeVisible()
  await pause.press('Enter')
  await expect(play).toBeVisible()
  await play.press('Enter')
  await expect(pause).toBeVisible()
})
