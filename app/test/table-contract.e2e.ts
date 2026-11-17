import { expect, test } from '@playwright/test'
import { bundleRuntimeFixture, mountRuntimeFixture } from './style-contract-helpers'

let fixture = ''
test.beforeAll(async () => {
  fixture = await bundleRuntimeFixture(
    new URL('./table-contract-fixture.ts', import.meta.url).pathname,
  )
})
test.beforeEach(async ({ page }) => {
  await mountRuntimeFixture(page, '/components/table', fixture)
  await expect(page.locator('#contract-table tbody tr')).toHaveCount(8)
})

test('legacy animation wrapper places moved and newly created fills on the first sampled frame', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const next = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
    const row = (index: number) => document.querySelector(`[data-fluid-hover-index="${index}"]`)
    row(1)?.dispatchEvent(new CustomEvent('fluid-table-highlight', { bubbles: true }))
    for (let i = 0; i < 20; i++) await next()
    const snap = document.getElementById('contract-snap')
    const add = document.getElementById('contract-add')
    if (snap === null || add === null) throw new Error('Controls are required')
    const before = row(1)?.getBoundingClientRect().y
    snap.click()
    await next()
    const moved = {
      row: row(1)?.getBoundingClientRect().y,
      hover: document.querySelector('.table-row-highlight')?.getBoundingClientRect().y,
      selection: document.querySelector('#contract-table-selection > div')?.getBoundingClientRect()
        .y,
      height: document.querySelector('#contract-table-selection > div')?.getBoundingClientRect()
        .height,
    }
    add.click()
    await next()
    const created = {
      row: row(8)?.getBoundingClientRect().y,
      selection: document.querySelector('#contract-table-selection > div')?.getBoundingClientRect()
        .y,
      height: document.querySelector('#contract-table-selection > div')?.getBoundingClientRect()
        .height,
    }
    return { before, moved, created }
  })
  expect(result.before).toBeDefined()
  expect(result.moved.row).toBeGreaterThan(result.before ?? 0)
  expect(result.moved.height).toBeGreaterThan(0)
  expect(result.created.height).toBeGreaterThan(0)
  expect(result.moved.row).toBeDefined()
  expect(result.moved.hover).toBeCloseTo(result.moved.row ?? 0, 2)
  expect(result.moved.selection).toBeCloseTo(result.moved.row ?? 0, 2)
  expect(result.created.row).toBeDefined()
  expect(result.created.selection).toBeCloseTo(result.created.row ?? 0, 2)
})

test('painted fill callbacks and divider coverage follow every native motion frame', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const next = () => new Promise(requestAnimationFrame)
    let callback: { y: number; height: number; opacity: number } | undefined
    document.addEventListener('contract-frame', (event) => {
      if (event instanceof CustomEvent) callback = event.detail
    })
    const rows = [...document.querySelectorAll<HTMLTableRowElement>('tbody tr')]
    rows[0]?.dispatchEvent(new CustomEvent('fluid-table-highlight', { bubbles: true }))
    for (let i = 0; i < 20; i++) await next()
    rows[5]?.dispatchEvent(new CustomEvent('fluid-table-highlight', { bubbles: true }))
    const frames = []
    for (let i = 0; i < 25; i++) {
      await next()
      const fill = document.querySelector('.table-row-highlight')
      const origin = document.querySelector<HTMLElement>('#contract-table-hover')
      if (fill === null || origin === null) throw new Error('Painted Table is required')
      const style = getComputedStyle(fill)
      const box = {
        y: new DOMMatrixReadOnly(style.transform).m42,
        height: parseFloat(style.height),
        opacity: Number(style.opacity),
      }
      const scale = origin.getBoundingClientRect().height / origin.offsetHeight
      const rules = rows.map((row) => {
        const bottom =
          (row.getBoundingClientRect().bottom - origin.getBoundingClientRect().top) / scale
        return (
          row.hasAttribute('data-under-highlight') ===
          (box.opacity >= 0.5 && bottom >= box.y - 1.5 && bottom <= box.y + box.height + 1.5)
        )
      })
      frames.push({
        index: i,
        box,
        callback,
        rules,
        callbackMatches:
          callback !== undefined &&
          Math.abs(callback.y - box.y) < 0.001 &&
          Math.abs(callback.height - box.height) < 0.001 &&
          Math.abs(callback.opacity - box.opacity) < 0.001,
      })
    }
    const [first] = rows
    const target = rows[5]
    if (first === undefined || target === undefined)
      throw new Error('Both row positions are required')
    first.style.transform = `translateY(${target.offsetTop - first.offsetTop}px)`
    for (let i = 0; i < 3; i++) await next()
    return { frames, transformedRule: first.hasAttribute('data-under-highlight') }
  })
  expect(result.transformedRule).toBe(false)
  expect(
    result.frames.filter((frame) => !frame.rules.every(Boolean) || !frame.callbackMatches),
  ).toEqual([])
})

test('selection mirrors share painted geometry, opacity and corner frames through merge and split', async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const next = () => new Promise(requestAnimationFrame)
    const button = document.getElementById('contract-select')
    if (button === null) throw new Error('Selection control is required')
    for (let i = 0; i < 10; i++) await next()
    const frames = []
    let sawSplit = false
    const read = (selector: string) =>
      [...document.querySelectorAll(selector)].map((node) => {
        const style = getComputedStyle(node)
        return {
          box: node.getBoundingClientRect().toJSON(),
          opacity: style.opacity,
          radius: style.borderRadius,
        }
      })
    for (let change = 0; change < 2; change++) {
      button.click()
      for (let i = 0; i < 30; i++) {
        await next()
        const primary = read('#contract-table-selection > div')
        const mirror = read('[data-selection-mirror] > div')
        sawSplit ||= primary.length >= 3
        frames.push(primary.length > 0 && JSON.stringify(primary) === JSON.stringify(mirror))
      }
    }
    return { frames, sawSplit }
  })
  expect(result.sawSplit).toBe(true)
  expect(result.frames.every(Boolean)).toBe(true)
})
