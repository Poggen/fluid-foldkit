import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    __routeCleanupAudit?: {
      readonly activeFor: (target: Element) => ReadonlyArray<number>
    }
  }
}

test('real Calendar observers disconnect on page exit and reacquire for a fresh visit', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeObserver = window.ResizeObserver
    const records: Array<{
      observer: ResizeObserver
      target: Element
      active: boolean
      id: number
    }> = []
    window.ResizeObserver = class extends NativeObserver {
      override observe(target: Element, options?: ResizeObserverOptions) {
        super.observe(target, options)
        if (!target.matches('[data-slot="calendar-root"]')) return
        const existing = records.find(
          (record) => record.observer === this && record.target === target,
        )
        if (existing === undefined)
          records.push({ observer: this, target, active: true, id: records.length })
        else existing.active = true
      }
      override disconnect() {
        super.disconnect()
        for (const record of records) if (record.observer === this) record.active = false
      }
      override unobserve(target: Element) {
        super.unobserve(target)
        for (const record of records)
          if (record.observer === this && record.target === target) record.active = false
      }
    }
    window.__routeCleanupAudit = {
      activeFor: (target) =>
        records
          .filter((record) => record.target === target && record.active)
          .map((record) => record.id),
    }
  })
  await page.goto('/components/calendar')
  const calendar = page.locator('.reference-preview [data-slot="calendar-root"]').first()
  await expect(calendar).toBeVisible()
  const old = await calendar.elementHandle()
  if (old === null) throw new Error('Expected a mounted Calendar')
  await expect
    .poll(() => old.evaluate((node) => window.__routeCleanupAudit?.activeFor(node).length ?? 0))
    .toBeGreaterThan(0)
  const oldLeases = await old.evaluate((node) => window.__routeCleanupAudit?.activeFor(node))
  await page.locator('#site-navigation').getByRole('link', { name: 'Input', exact: true }).click()
  await expect(page).toHaveURL(/\/components\/input(?:\?|$)/u)
  await expect
    .poll(() => old.evaluate((node) => window.__routeCleanupAudit?.activeFor(node)))
    .toEqual([])
  expect(await old.evaluate((node) => node.isConnected)).toBe(false)
  await page
    .locator('#site-navigation')
    .getByRole('link', { name: 'Calendar', exact: true })
    .click()
  await expect(calendar).toBeVisible()
  await expect
    .poll(() =>
      calendar.evaluate((node) => window.__routeCleanupAudit?.activeFor(node).length ?? 0),
    )
    .toBeGreaterThan(0)
  expect(
    await calendar.evaluate((node) => window.__routeCleanupAudit?.activeFor(node)),
  ).not.toEqual(oldLeases)
  expect(await old.evaluate((node) => window.__routeCleanupAudit?.activeFor(node))).toEqual([])
})
