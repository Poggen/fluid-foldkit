import { expect, test } from '@playwright/test'

for (const family of ['line', 'area', 'bar', 'composed']) {
  test(`${family} ignores unrelated releases and scopes generated CSS to each owner`, async ({
    page,
  }) => {
    await page.goto(`/charts/${family}`)
    await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
    await expect(page.locator('.reference-preview [data-bkm-kit]')).toBeAttached()
    const result = await page.evaluate(() => {
      let dragEvents = 0
      const roots = [...document.querySelectorAll<HTMLElement>('[data-bkm-kit]')]
      const counted = () => {
        dragEvents += 1
      }
      for (const root of roots) root.addEventListener('drag-observed', counted)
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          pointerId: 345,
          pointerType: 'mouse',
          button: 0,
          buttons: 0,
        }),
      )
      window.dispatchEvent(
        new PointerEvent('pointercancel', {
          pointerId: 345,
          pointerType: 'mouse',
          button: 0,
          buttons: 0,
        }),
      )
      for (const root of roots) root.removeEventListener('drag-observed', counted)
      return {
        count: roots.length,
        dragEvents,
        scoped: roots.every((root) =>
          [...root.classList].some((token) => token.startsWith('bkm-scope-')),
        ),
      }
    })
    expect(result.count).toBeGreaterThan(0)
    expect(result.dragEvents).toBe(0)
    expect(result.scoped).toBe(true)
  })
}

test('Dialog activation and exit preserve body topology and return keyboard focus', async ({
  page,
}) => {
  await page.goto('/components/dialog')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  await expect(page.locator('[data-fluid-dialog-portal-root]')).toBeAttached()
  const observed = await page.evaluateHandle(() => {
    const records: Array<MutationRecord> = []
    const observer = new MutationObserver((changes) => records.push(...changes))
    observer.observe(document.body, { childList: true })
    return {
      finish: () => {
        records.push(...observer.takeRecords())
        observer.disconnect()
        return records.length
      },
    }
  })
  const trigger = page
    .getByRole('region', { name: 'Playground', exact: true })
    .getByRole('button', { name: 'Open dialog', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'A little focus', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  expect(await observed.evaluate((record) => record.finish())).toBe(0)
  await observed.dispose()
})
