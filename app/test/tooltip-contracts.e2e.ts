import { expect, test } from '@playwright/test'
import {
  bundleRuntimeFixture,
  loadBuiltStyles,
  mountRuntimeFixture,
} from './style-contract-helpers.js'

type LabelPresentation = { fontSize: string; color: string }

let code = ''
test.beforeAll(async () => {
  code = await bundleRuntimeFixture(
    new URL('./tooltip-contract-fixture.ts', import.meta.url).pathname,
  )
})

test('morph captures the current label and preserves surviving native nodes after source removal', async ({
  page,
}) => {
  await mountRuntimeFixture(page, '/components/tooltip', code)
  await page.locator('#show-a').evaluate((node: HTMLButtonElement) => node.click())
  await expect(page.locator('#a-popup')).toBeVisible()
  await page.locator('#update-label').evaluate((node: HTMLButtonElement) => node.click())
  await expect(page.locator('#a-popup')).toHaveText('Latest source label')
  const result = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const b = document.getElementById('trigger-b')
        const c = document.getElementById('trigger-c')
        let popup: Element | null = null
        let captured: HTMLElement | null = null
        let changed = false
        const timeout = setTimeout(() => {
          observer.disconnect()
          reject(new Error('No retained handoff capture observed'))
        }, 3000)
        const observer = new MutationObserver(() => {
          const next = document.querySelector<HTMLElement>('#b-popup [data-tooltip-previous]')
          const box = document.querySelector<HTMLElement>('#b-popup [data-tooltip-group-box]')
          if (!changed && next && box?.style.opacity === '1') {
            popup = document.getElementById('b-popup')
            captured = next
            changed = true
            document.getElementById('update-label')?.click()
            document.getElementById('remove-a')?.click()
          }
          if (changed && !document.getElementById('trigger-a')) {
            observer.disconnect()
            clearTimeout(timeout)
            resolve({
              label: captured?.textContent,
              retained: captured?.isConnected,
              inert: captured?.inert,
              hidden: captured?.getAttribute('aria-hidden'),
              duplicateIds: captured?.querySelectorAll('[id]').length,
              popupStable: popup === document.getElementById('b-popup'),
              triggersStable:
                b === document.getElementById('trigger-b') &&
                c === document.getElementById('trigger-c'),
            })
          }
        })
        observer.observe(document.body, { childList: true, subtree: true, attributes: true })
        document.getElementById('show-b')?.click()
      }),
  )
  expect(result).toEqual({
    label: 'Latest source label',
    retained: true,
    inert: true,
    hidden: 'true',
    duplicateIds: 0,
    popupStable: true,
    triggersStable: true,
  })
  await expect(page.locator('[data-tooltip-previous]')).toHaveCount(0)
  await expect(page.locator('#b-popup')).toHaveText('Beta much wider label')
})

test('hoverable content, pass-through content and keyboard shortcuts retain distinct behavior', async ({
  page,
}) => {
  await mountRuntimeFixture(page, '/components/tooltip', code)
  const hoverable = page.locator('#trigger-hover-on')
  await hoverable.hover()
  await expect(hoverable).toHaveAttribute('aria-describedby', 'hover-on-popup')
  const normalHeight = await page
    .locator('#hover-on-popup')
    .evaluate((node) => node.getBoundingClientRect().height)
  await page.locator('#hover-on-popup').hover()
  await expect(hoverable).toHaveAttribute('aria-describedby', 'hover-on-popup')
  const pass = page.locator('#trigger-hover-off')
  await pass.hover()
  await expect(pass).toHaveAttribute('aria-describedby', 'hover-off-popup')
  await expect(page.locator('#hover-off-popup')).toHaveCSS('pointer-events', 'none')
  const box = await page.locator('#hover-off-popup').boundingBox()
  if (box === null) throw new Error('Missing pass-through popup geometry')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await expect(pass).not.toHaveAttribute('aria-describedby')
  await page.mouse.move(1200, 850)
  await expect(page.locator('[data-tooltip-popup][data-state="open"]')).toHaveCount(0)
  await pass.focus()
  await page.keyboard.press('Tab')
  const keyboard = page.locator('#trigger-keyboard')
  await expect(keyboard).toBeFocused()
  await expect(keyboard).toHaveAttribute('aria-describedby', 'keyboard-popup')
  await expect(page.locator('#keyboard-popup kbd')).toHaveText(['⇧', '⌘', 'O'])
  await expect(page.locator('#keyboard-popup kbd').first()).toHaveCSS('height', '18px')
  expect(
    await page.locator('#keyboard-popup').evaluate((node) => node.getBoundingClientRect().height),
  ).toBeCloseTo(normalHeight, 1)
  await expect(page.locator('[data-tooltip-popup][data-state="open"]')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(keyboard).not.toHaveAttribute('aria-describedby')
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Tab')
  await expect(keyboard).toHaveAttribute('aria-describedby', 'keyboard-popup')
})

test('disposing during a transfer releases snapshots, portals and viewport subscriptions', async ({
  page,
}) => {
  await loadBuiltStyles(page, '/components/tooltip', '<main id="style-contract-root"></main>')
  const listeners = await page.evaluateHandle(() => {
    const active = new Set<EventListenerOrEventListenerObject>()
    const add = window.addEventListener.bind(window)
    const remove = window.removeEventListener.bind(window)
    window.addEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if ((type === 'scroll' || type === 'resize') && listener !== null) active.add(listener)
      if (listener !== null) add(type, listener, options)
    }
    window.removeEventListener = (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions,
    ) => {
      if (listener !== null) active.delete(listener)
      if (listener !== null) remove(type, listener, options)
    }
    return {
      active,
      restore: () => {
        window.addEventListener = add
        window.removeEventListener = remove
      },
    }
  })
  await page.addScriptTag({ content: code })
  await page.locator('#show-a').evaluate((node: HTMLButtonElement) => node.click())
  await expect(page.locator('#a-popup')).toBeVisible()
  const disposedDuringTransfer = await page.evaluate(
    () =>
      new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          observer.disconnect()
          reject(new Error('No capture to dispose'))
        }, 3000)
        const observer = new MutationObserver(() => {
          const box = document.querySelector<HTMLElement>('#b-popup [data-tooltip-group-box]')
          if (document.querySelector('[data-tooltip-previous]') && box?.style.opacity === '1') {
            observer.disconnect()
            clearTimeout(timeout)
            window.dispatchEvent(new Event('tooltip-contract-dispose'))
            resolve(true)
          }
        })
        observer.observe(document.body, { childList: true, subtree: true, attributes: true })
        document.getElementById('show-b')?.click()
      }),
  )
  expect(disposedDuringTransfer).toBe(true)
  await expect(page.locator('[data-tooltip-popup]')).toHaveCount(0)
  await expect(page.locator('[data-tooltip-previous]')).toHaveCount(0)
  await expect.poll(() => listeners.evaluate((value) => value.active.size)).toBe(0)
  await listeners.evaluate((value) => value.restore())
})

test('disabling hoverability over an open bubble preserves departure and cancels grace waiting', async ({
  page,
}) => {
  await mountRuntimeFixture(page, '/components/tooltip', code)
  const trigger = page.locator('#trigger-hover-on')
  await trigger.hover()
  await expect(trigger).toHaveAttribute('aria-describedby', 'hover-on-popup')
  await page.locator('#hover-on-popup').hover()
  await page.locator('#toggle-hover').evaluate((node: HTMLButtonElement) => node.click())
  await expect(page.locator('#hover-on-popup')).toHaveCSS('pointer-events', 'none')
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )
  await expect(trigger).toHaveAttribute('aria-describedby', 'hover-on-popup')
  await page.mouse.move(1200, 850)
  await expect(trigger).not.toHaveAttribute('aria-describedby')
  await expect(page.locator('#hover-on-popup')).toHaveCount(0)
})

test('captured content inherits destination label presentation and retains explicit inner styles', async ({
  page,
}) => {
  await mountRuntimeFixture(page, '/components/tooltip', code)
  await page.locator('#show-style-a').evaluate((node: HTMLButtonElement) => node.click())
  await expect(page.locator('#style-a-popup')).toBeVisible()
  const source = await page.locator('#style-a-popup [data-tooltip-label]').evaluate((node) => ({
    fontSize: getComputedStyle(node).fontSize,
    color: getComputedStyle(node).color,
  }))
  const captured = await page.evaluate(
    () =>
      new Promise<{
        previous: LabelPresentation
        destination: LabelPresentation
        updatedPrevious: LabelPresentation
        updatedDestination: LabelPresentation
        inner: LabelPresentation
      }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          observer.disconnect()
          reject(new Error('Missing visible styled capture'))
        }, 3000)
        let initial: { previous: LabelPresentation; destination: LabelPresentation } | undefined
        const observer = new MutationObserver(() => {
          const box = document.querySelector<HTMLElement>('#style-b-popup [data-tooltip-group-box]')
          const previous = box?.querySelector<HTMLElement>('[data-tooltip-previous]')
          const destination = box?.querySelector<HTMLElement>('[data-tooltip-label]')
          const inner = previous?.querySelector<HTMLElement>('[data-explicit-style]')
          if (
            box?.style.opacity !== '1' ||
            !previous ||
            !destination ||
            !inner ||
            +getComputedStyle(previous).opacity === 0
          )
            return
          const presentation = (node: Element) => ({
            fontSize: getComputedStyle(node).fontSize,
            color: getComputedStyle(node).color,
          })
          if (initial === undefined) {
            initial = { previous: presentation(previous), destination: presentation(destination) }
            document.getElementById('update-style')?.click()
            return
          }
          const updatedPrevious = presentation(previous)
          const updatedDestination = presentation(destination)
          if (
            updatedDestination.fontSize !== '14px' ||
            updatedPrevious.fontSize !== '14px' ||
            updatedPrevious.color !== updatedDestination.color
          )
            return
          observer.disconnect()
          clearTimeout(timeout)
          resolve({ ...initial, updatedPrevious, updatedDestination, inner: presentation(inner) })
        })
        observer.observe(document.body, { childList: true, subtree: true, attributes: true })
        document.getElementById('show-style-b')?.click()
      }),
  )
  expect(source.fontSize).not.toBe(captured.destination.fontSize)
  expect(source.color).not.toBe(captured.destination.color)
  expect(captured.previous).toEqual(captured.destination)
  expect(captured.updatedPrevious).toEqual(captured.updatedDestination)
  expect(captured.updatedDestination.fontSize).toBe('14px')
  expect(captured.updatedDestination.color).not.toBe(captured.destination.color)
  expect(captured.inner).toEqual({ fontSize: '18px', color: 'rgb(0, 0, 255)' })
  await expect(page.locator('[data-tooltip-previous]')).toHaveCount(0)
})

test('simultaneous captures retain SVG rendering references without navigation or duplicate IDs', async ({
  page,
}) => {
  await mountRuntimeFixture(page, '/components/tooltip', code)
  for (const key of ['svg-a', 'svg2-a']) {
    await page.locator(`#show-${key}`).evaluate((node: HTMLButtonElement) => node.click())
    await expect(page.locator(`#${key}-popup`)).toBeVisible()
    expect(
      await page
        .locator(`#${key}-popup [data-local-svg] use`)
        .evaluate((node: SVGGraphicsElement) => node.getBBox().width),
    ).toBe(12)
  }
  const captures = await page.evaluate(
    () =>
      new Promise<{
        rows: Array<{
          svg: string
          ids: string[]
          localReferencesResolve: boolean
          localWidth: number
          externalWidth: number
          externalHref: string | null
          navigation: string | null
          inert: boolean
          hidden: string | null
        }>
        duplicateIds: string[]
      }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          observer.disconnect()
          reject(new Error('Missing simultaneous SVG captures'))
        }, 3000)
        const observer = new MutationObserver(() => {
          const previous = ['svg-b', 'svg2-b'].map((key) => {
            const box = document.querySelector<HTMLElement>(
              `#${key}-popup [data-tooltip-group-box]`,
            )
            const label = box?.querySelector<HTMLElement>('[data-tooltip-previous]')
            return box?.style.opacity === '1' && label && +getComputedStyle(label).opacity > 0
              ? label
              : null
          })
          if (previous.some((node) => node === null)) return
          const rows = previous
            .filter((node): node is HTMLElement => node !== null)
            .map((node) => {
              const svg = node.querySelector<SVGSVGElement>('[data-local-svg]')
              const local = svg?.querySelector('use')
              const external = node.querySelector<SVGUseElement>('[data-external-svg] use')
              const anchor = node.querySelector('a')
              if (!svg || !local || !external || !anchor)
                throw new Error('Missing captured SVG content')
              const localRef =
                local.getAttribute('href') ??
                local.getAttributeNS('http://www.w3.org/1999/xlink', 'href')
              const gradientRef = svg
                .querySelector('rect')
                ?.getAttribute('fill')
                ?.match(/url\(#([^)]*)\)/)?.[1]
              return {
                svg: new XMLSerializer().serializeToString(svg),
                ids: [...node.querySelectorAll('[id]')].map((element) => element.id),
                localReferencesResolve:
                  localRef?.startsWith('#') === true &&
                  svg.contains(document.getElementById(localRef.slice(1))) &&
                  !!gradientRef &&
                  svg.contains(document.getElementById(gradientRef)),
                localWidth: local.getBBox().width,
                externalWidth: external.getBBox().width,
                externalHref: external.getAttribute('href'),
                navigation: anchor.getAttribute('href'),
                inert: node.inert,
                hidden: node.getAttribute('aria-hidden'),
              }
            })
          const ids = [...document.querySelectorAll('[id]')].map((node) => node.id)
          observer.disconnect()
          clearTimeout(timeout)
          resolve({ rows, duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index) })
        })
        observer.observe(document.body, { childList: true, subtree: true, attributes: true })
        document.getElementById('show-svg-b')?.click()
        document.getElementById('show-svg2-b')?.click()
      }),
  )
  expect(captures.duplicateIds).toEqual([])
  for (const row of captures.rows) {
    expect(row).toMatchObject({
      localReferencesResolve: true,
      localWidth: 12,
      externalWidth: 12,
      externalHref: '#tooltip-external-mark',
      navigation: null,
      inert: true,
      hidden: 'true',
    })
    expect(row.ids).toHaveLength(2)
    const pixels = await page.evaluate(async (svg) => {
      const image = new Image()
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = 24
      canvas.height = 12
      const context = canvas.getContext('2d')
      if (context === null) throw new Error('Missing canvas raster context')
      context.drawImage(image, 0, 0)
      return {
        use: [...context.getImageData(6, 6, 1, 1).data],
        gradient: [...context.getImageData(18, 6, 1, 1).data],
      }
    }, row.svg)
    expect(pixels.use).toEqual([255, 0, 0, 255])
    expect(pixels.gradient).toEqual([0, 138, 117, 255])
  }
  await expect(page.locator('[data-tooltip-previous]')).toHaveCount(0)
  expect(
    await page.evaluate(
      (ids) => ids.every((id) => document.getElementById(id) === null),
      captures.rows.flatMap((row) => row.ids),
    ),
  ).toBe(true)
  await page.evaluate(() => window.dispatchEvent(new Event('tooltip-contract-dispose')))
  await expect(page.locator('[data-tooltip-popup]')).toHaveCount(0)
  expect(
    await page.evaluate(
      (ids) => ids.every((id) => document.getElementById(id) === null),
      captures.rows.flatMap((row) => row.ids),
    ),
  ).toBe(true)
})
