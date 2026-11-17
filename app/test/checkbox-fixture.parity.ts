import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const fixture = (values: Record<string, boolean> = {}) =>
  `http://127.0.0.1:5742/?${new URLSearchParams(Object.entries(values).map(([key, value]) => [key, String(value)]))}`
const control = (page: Page) => page.locator('#choice')
const observeChange = (page: Page, name: string) =>
  page.evaluate(async (name) => {
    const checkbox = document.querySelector('#choice')!
    const previous = checkbox.querySelector('path')
    const frames: {
      phase: 'mutation' | 'frame' | 'final'
      checked: string | null
      paths: { d: string | null; stroke: number; same: boolean }[]
    }[] = []
    const capture = (phase: 'mutation' | 'frame' | 'final') =>
      frames.push({
        phase,
        checked: checkbox.getAttribute('aria-checked'),
        paths: [...checkbox.querySelectorAll('path')].map((path) => ({
          d: path.getAttribute('d'),
          stroke: Number.parseFloat(path.getAttribute('stroke-dasharray') ?? '-1'),
          same: path === previous,
        })),
      })
    const observer = new MutationObserver(() => capture('mutation'))
    observer.observe(checkbox, { childList: true, attributes: true, subtree: true })
    ;[...document.querySelectorAll('button')].find((button) => button.textContent === name)!.click()
    let active = true
    const frame = () => {
      if (!active) return
      capture('frame')
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
    await new Promise((resolve) => setTimeout(resolve, 180))
    active = false
    capture('final')
    observer.disconnect()
    return frames
  }, name)

for (const checked of [false, true]) {
  for (const key of ['pointer', 'Space']) {
    test(`Base mixed checked=${checked} ${key} forwards native inversion`, async ({ page }) => {
      await page.goto(fixture({ checked, indeterminate: true }))
      await expect(control(page)).toHaveAttribute('aria-checked', 'mixed')
      await expect(control(page).locator('path')).toHaveAttribute('d', 'M7 12H17')
      if (key === 'pointer') await control(page).click()
      else await control(page).press('Space')
      await expect(page.locator('#requests')).toHaveText(JSON.stringify([!checked]))
      await expect(control(page)).toHaveAttribute('aria-checked', String(!checked))
    })
  }
  test(`controlled refusal preserves mixed checked=${checked}`, async ({ page }) => {
    await page.goto(fixture({ checked, indeterminate: true, refuse: true }))
    await control(page).click()
    await control(page).press('Space')
    await expect(page.locator('#requests')).toHaveText(JSON.stringify([!checked, !checked]))
    await expect(control(page)).toHaveAttribute('aria-checked', 'mixed')
    await expect(control(page).locator('path')).toHaveAttribute('d', 'M7 12H17')
  })
}

for (const reduced of [false, true]) {
  test(`one-glyph replacement, retained exit and reversal reduced=${reduced}`, async ({
    page,
  }, testInfo) => {
    await page.goto(fixture({ checked: true, reduced }))
    await expect(control(page).locator('path')).toHaveAttribute('stroke-dasharray', '1 1')
    const dash = await observeChange(page, 'Dash')
    expect(dash.every((frame) => frame.paths.length <= 1)).toBe(true)
    expect(
      dash
        .filter((frame) => frame.phase === 'frame')
        .every((frame) => frame.paths.every((path) => path.stroke >= 0)),
    ).toBe(true)
    const replaced = dash.find((frame) => frame.checked === 'mixed')!
    expect(replaced.paths).toHaveLength(1)
    expect(replaced.paths[0]).toMatchObject({ d: 'M7 12H17', same: false })
    expect(
      dash.some((frame) => frame.paths.some((path) => path.stroke > 0 && path.stroke < 1)),
    ).toBe(true)
    const check = await observeChange(page, 'Check')
    expect(check.every((frame) => frame.paths.length <= 1)).toBe(true)
    expect(check.find((frame) => frame.checked === 'true')!.paths[0]).toMatchObject({
      d: 'M6 12L10 16L18 8',
      same: false,
    })
    const empty = await observeChange(page, 'Empty')
    expect(
      empty.some(
        (frame) =>
          frame.checked === 'false' &&
          frame.paths.some((path) => path.same && path.stroke > 0 && path.stroke < 1),
      ),
    ).toBe(true)
    expect(empty.at(-1)!.paths).toEqual([])
    await page.getByRole('button', { name: 'Dash', exact: true }).click()
    await page.evaluate(async () => {
      const button = (name: string) =>
        [...document.querySelectorAll('button')].find((button) => button.textContent === name)!
      button('Empty').click()
      await new Promise(requestAnimationFrame)
      button('Check').click()
      await new Promise(requestAnimationFrame)
      button('Empty').click()
      await new Promise(requestAnimationFrame)
      button('Dash').click()
    })
    await expect(control(page)).toHaveAttribute('aria-checked', 'mixed')
    await expect(control(page).locator('path')).toHaveCount(1)
    await expect(control(page).locator('path')).toHaveAttribute('d', 'M7 12H17')
    await expect(control(page).locator('path')).toHaveAttribute('stroke-dasharray', '1 1')
    await testInfo.attach('glyph-lifecycle', {
      body: JSON.stringify({ dash, check, empty }),
      contentType: 'application/json',
    })
  })
}

test('native readOnly, disabled, labels, card Enter, reset and required focus remain intact', async ({
  page,
}) => {
  for (const blocked of ['readOnly', 'disabled']) {
    await page.goto(fixture({ checked: true, indeterminate: true, [blocked]: true }))
    await control(page).dispatchEvent('click')
    await control(page).dispatchEvent('keyup', { key: ' ' })
    await expect(page.locator('#requests')).toHaveText('[]')
    await expect(control(page)).toHaveAttribute('aria-checked', 'mixed')
  }
  await page.goto(fixture({ indeterminate: true, required: true }))
  await page.getByRole('button', { name: 'Submit', exact: true }).click()
  await expect(control(page)).toBeFocused()
  await control(page).press('Enter')
  await expect(page.locator('#requests')).toHaveText('[]')
  await page.locator('label[for="choice"]').click()
  await expect(control(page)).toHaveAttribute('aria-checked', 'true')
  expect(
    await page.locator('form').evaluate((form) => [...new FormData(form as HTMLFormElement)]),
  ).toEqual([['choice', 'yes']])
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(control(page)).toHaveAttribute('aria-checked', 'false')
  await expect(page.locator('input[type=checkbox]')).not.toBeChecked()
  await page.goto(fixture({ card: true, indeterminate: true }))
  await control(page).press('Enter')
  await expect(control(page)).toHaveAttribute('aria-checked', 'true')
})

test('mixed border, size and shape use the source styles', async ({ page }) => {
  for (const compact of [false, true]) {
    for (const sharp of [false, true]) {
      await page.goto(fixture({ indeterminate: true, compact, sharp }))
      await expect(control(page)).toHaveCSS('width', compact ? '14px' : '16px')
      await expect(control(page)).toHaveCSS(
        'border-radius',
        sharp ? '0px' : compact ? '4px' : '5px',
      )
      await expect(control(page)).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)')
      await expect(control(page).locator('svg')).toHaveAttribute('width', compact ? '16' : '18')
    }
  }
})
