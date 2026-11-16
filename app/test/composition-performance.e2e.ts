import { expect, test } from '@playwright/test'

for (const source of ['preview-line', 'authored-line-markers']) {
  test(`${source} hover leaves other chart owners untouched while tooltip stays live`, async ({
    page,
  }) => {
    await page.goto('/charts/line')
    await expect(page.locator('[data-live-previews=true]')).toBeVisible()
    const preview = page.locator(`[data-bkm-kit="${source}"]`)
    const sibling = page.locator('[data-bkm-kit="authored-line-reference"]')
    await expect(sibling.locator('svg').first()).toBeAttached()
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toHaveAttribute('data-bkm-ready', '')
    await expect(sibling).toHaveAttribute('data-bkm-ready', '')
    const svg = await sibling.locator('svg').first().elementHandle()
    const probe = await sibling.evaluateHandle((element) => {
      const records: Array<MutationRecord> = []
      const observer = new MutationObserver((changes) => records.push(...changes))
      observer.observe(element, {
        subtree: true,
        attributes: true,
        childList: true,
        characterData: true,
      })
      return {
        finish: () => {
          records.push(...observer.takeRecords())
          observer.disconnect()
          return records.length
        },
      }
    })
    try {
      const bounds = await preview.boundingBox()
      expect(bounds).not.toBeNull()
      const outputs = new Set<string>()
      let previous = ''
      for (const fraction of [0.25, 0.5, 0.75]) {
        await page.mouse.move(
          bounds!.x + bounds!.width * fraction,
          bounds!.y + bounds!.height * 0.5,
        )
        const tooltip = page.locator(`#${source}-tooltip`)
        await expect(tooltip).toContainText(source === 'preview-line' ? 'revenue' : 'users')
        await expect.poll(() => tooltip.innerText()).not.toBe(previous)
        previous = await tooltip.innerText()
        outputs.add(previous)
      }
      expect(outputs.size).toBe(3)
      expect(await probe.evaluate((value) => value.finish())).toBe(0)
      expect(await svg?.evaluate((element) => element.isConnected)).toBe(true)
    } finally {
      await probe.evaluate((value) => value.finish())
      await probe.dispose()
    }
  })
}
