import { expect, test, type Page } from '@playwright/test'

async function permanentOwners(page: Page) {
  return page.evaluate(() => {
    const owners: {
      selector: string
      sheetIndex: number
      tag: string | null
      parent: string | null
      topLevel: boolean
    }[] = []
    const visit = (
      rules: CSSRuleList,
      sheetIndex: number,
      owner: Node | null,
      topLevel: boolean,
    ) => {
      for (const rule of rules) {
        if (
          rule instanceof CSSStyleRule &&
          (rule.selectorText.includes('::view-transition-old(root)') ||
            rule.selectorText.includes(':active-view-transition'))
        ) {
          owners.push({
            selector: rule.selectorText,
            sheetIndex,
            tag: owner instanceof Element ? owner.tagName : null,
            parent: owner instanceof Element ? (owner.parentElement?.tagName ?? null) : null,
            topLevel,
          })
        }
        if (rule instanceof CSSImportRule && rule.styleSheet) {
          visit(rule.styleSheet.cssRules, sheetIndex, owner, false)
        } else if (rule instanceof CSSGroupingRule) {
          visit(rule.cssRules, sheetIndex, owner, false)
        }
      }
    }
    for (const [index, sheet] of [...document.styleSheets].entries()) {
      // Cross-origin font sheets are unrelated and inaccessible through CSSOM.
      if (sheet.href && new URL(sheet.href).origin !== location.origin) continue
      visit(sheet.cssRules, index, sheet.ownerNode, true)
    }
    return owners
  })
}

async function expectNoOwner(page: Page) {
  await expect.poll(() => permanentOwners(page)).toEqual([])
  await expect(page.locator('style[data-shape-transition-styles]')).toHaveCount(0)
}

async function observeTheme(page: Page) {
  return page.evaluateHandle(() => {
    const samples: { oldOpacity: number; newOpacity: number; duration: string }[] = []
    const transient: string[] = []
    const suppression: { property: string; duration: string }[][] = []
    const mutations: string[] = []
    let frame = 0
    const styles = new Set<HTMLStyleElement>()
    const portal = document.querySelector('[role="listbox"]')
    if (!portal || portal.closest('.site')) throw new Error('Expected a real portalled control')
    const observer = new MutationObserver((records) => {
      mutations.push(...records.map((record) => record.type))
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (
            node instanceof HTMLStyleElement &&
            node.textContent?.endsWith('*,*::before,*::after{transition:none!important}')
          ) {
            styles.add(node)
            transient.push(node.textContent)
            if (portal.isConnected)
              suppression.push(
                [document.body, portal].flatMap((element) =>
                  [null, '::before', '::after'].map((pseudo) => {
                    const computed = getComputedStyle(element, pseudo)
                    return {
                      property: computed.transitionProperty,
                      duration: computed.transitionDuration,
                    }
                  }),
                ),
              )
          }
        }
      }
    })
    observer.observe(document.head, { childList: true })
    const sample = () => {
      if (document.documentElement.matches(':active-view-transition')) {
        const old = getComputedStyle(document.documentElement, '::view-transition-old(root)')
        const next = getComputedStyle(document.documentElement, '::view-transition-new(root)')
        samples.push({
          oldOpacity: Number(old.opacity),
          newOpacity: Number(next.opacity),
          duration: old.animationDuration,
        })
      }
      frame = requestAnimationFrame(sample)
    }
    frame = requestAnimationFrame(sample)
    return {
      samples,
      transient,
      suppression,
      mutations,
      released: () => styles.size > 0 && [...styles].every((style) => !style.isConnected),
      dispose: () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
      },
    }
  })
}

const pageErrors = new WeakMap<Page, string[]>()
const collectErrors = (page: Page) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  pageErrors.set(page, errors)
  return errors
}
test.beforeEach(({ page }) => {
  collectErrors(page)
})
test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([])
})

for (const route of ['/', '/components/input', '/components/input?embed=1']) {
  test(`SSR has no idle theme transition stylesheet at ${route}`, async ({ browser, baseURL }) => {
    if (!baseURL) throw new Error('Explicit test baseURL required')
    const context = await browser.newContext({ javaScriptEnabled: false })
    try {
      const page = await context.newPage()
      const errors = collectErrors(page)
      const response = await page.goto(new URL(route, baseURL).href)
      expect(response?.ok()).toBe(true)
      const html = await response?.text()
      expect(html).not.toContain('::view-transition-old(root)')
      expect(html).toContain("document.documentElement.classList.toggle('dark'")
      if (process.env.THEME_STYLE_HOST === 'diagnostic') {
        const traceparent = page.locator('meta[name="showcase-traceparent"]')
        await expect(traceparent).toHaveAttribute(
          'content',
          /^00-[a-f0-9]{32}-[a-f0-9]{16}-[a-f0-9]{2}$/u,
        )
      }
      await expectNoOwner(page)
      expect(errors).toEqual([])
    } finally {
      await context.close()
    }
  })
}

test('hydration, navigation and reload leave no theme transition stylesheet', async ({ page }) => {
  await page.goto('/components/input?theme=light')
  await expect(
    page.locator('#site-customizer').getByRole('combobox', { name: 'Theme', exact: true }),
  ).toContainText('Light')
  const timeOrigin = await page.evaluate(() => performance.timeOrigin)
  await expectNoOwner(page)
  await page.locator('#site-navigation').getByRole('link', { name: 'Sidebar', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Sidebar', exact: true })).toBeVisible()
  await expectNoOwner(page)
  await page
    .locator('#site-navigation')
    .getByRole('link', { name: 'Showcase', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { level: 1, name: 'Fluid Functionalism', exact: true }),
  ).toBeVisible()
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(timeOrigin)
  await expectNoOwner(page)
  await page.reload()
  await expectNoOwner(page)
  await page.goto('/components/input?embed=1')
  await expect(page.locator('.embedded-preview')).toBeVisible()
  await expectNoOwner(page)
})

test('native replacement theme transition interpolates after active Back navigation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference', colorScheme: 'light' })
  await page.goto('/components/input?theme=light')
  const theme = page
    .locator('#site-customizer')
    .getByRole('combobox', { name: 'Theme', exact: true })
  await expect(theme).toContainText('Light')
  const observation = await page.evaluateHandle(() => {
    type Generation = {
      id: number
      startedAt: number
      ready: 'pending' | 'resolved' | 'rejected'
      readyAt: number | null
      finished: 'pending' | 'resolved' | 'rejected'
      finishedAt: number | null
      samples: { oldOpacity: number; newOpacity: number; duration: string; suppressed: boolean }[]
      guardedBeforeSnapshot: boolean
      guardedUntilFinished: boolean
    }
    const generations: Generation[] = []
    const traversals: {
      at: number
      active: boolean
      firstUnfinished: boolean
      theme: string | null
    }[] = []
    const backRequests: { at: number; active: boolean }[] = []
    const originalDescriptor = Object.getOwnPropertyDescriptor(document, 'startViewTransition')
    const nativeStart = document.startViewTransition.bind(document)
    let frame = 0
    document.startViewTransition = (...args: Parameters<typeof nativeStart>) => {
      const styles = [...document.head.querySelectorAll('style')].filter((style) =>
        style.textContent?.endsWith('*,*::before,*::after{transition:none!important}'),
      )
      const generation: Generation = {
        id: generations.length + 1,
        startedAt: performance.now(),
        ready: 'pending',
        readyAt: null,
        finished: 'pending',
        finishedAt: null,
        guardedBeforeSnapshot:
          styles.length > 0 && getComputedStyle(document.body).transitionDuration === '0s',
        guardedUntilFinished: false,
        samples: [],
      }
      const transition = nativeStart(...args)
      generations.push(generation)
      void transition.ready.then(
        () => {
          generation.ready = 'resolved'
          generation.readyAt = performance.now()
          const snapshots = document
            .getAnimations()
            .filter(
              (animation) =>
                animation.effect instanceof KeyframeEffect &&
                ['::view-transition-old(root)', '::view-transition-new(root)'].includes(
                  animation.effect.pseudoElement ?? '',
                ),
            )
          for (const animation of snapshots) {
            animation.pause()
            animation.currentTime = Number(animation.effect?.getComputedTiming().duration) / 2
          }
          const old = getComputedStyle(document.documentElement, '::view-transition-old(root)')
          const next = getComputedStyle(document.documentElement, '::view-transition-new(root)')
          generation.samples.push({
            oldOpacity: Number(old.opacity),
            newOpacity: Number(next.opacity),
            duration: old.animationDuration,
            suppressed: getComputedStyle(document.body).transitionDuration === '0s',
          })
          if (generation.id !== 1) for (const animation of snapshots) animation.play()
        },
        () => {
          generation.ready = 'rejected'
          generation.readyAt = performance.now()
        },
      )
      void transition.finished.then(
        () => {
          generation.finished = 'resolved'
          generation.finishedAt = performance.now()
          generation.guardedUntilFinished = styles.some((style) => style.isConnected)
        },
        () => {
          generation.finished = 'rejected'
          generation.finishedAt = performance.now()
          generation.guardedUntilFinished = styles.some((style) => style.isConnected)
        },
      )
      return transition
    }
    const onPopState = () =>
      traversals.push({
        at: performance.now(),
        active: document.documentElement.matches(':active-view-transition'),
        firstUnfinished: generations[0]?.finished === 'pending',
        theme: new URL(location.href).searchParams.get('theme'),
      })
    window.addEventListener('popstate', onPopState, true)
    const sample = () => {
      const generation = generations.at(-1)
      const active = document.documentElement.matches(':active-view-transition')
      if (generation?.ready === 'resolved' && generation.finished === 'pending' && active) {
        if (
          generation.id === 1 &&
          backRequests.length === 0 &&
          new URL(location.href).searchParams.get('theme') === 'dark'
        ) {
          backRequests.push({ at: performance.now(), active })
          history.back()
        }
      }
      frame = requestAnimationFrame(sample)
    }
    frame = requestAnimationFrame(sample)
    return {
      generations,
      traversals,
      backRequests,
      dispose: () => {
        cancelAnimationFrame(frame)
        window.removeEventListener('popstate', onPopState, true)
        if (originalDescriptor)
          Object.defineProperty(document, 'startViewTransition', originalDescriptor)
        else Reflect.deleteProperty(document, 'startViewTransition')
      },
    }
  })
  try {
    await page.keyboard.press('t')
    await expect
      .poll(() =>
        observation.evaluate(({ generations, backRequests, traversals }) => ({
          generations,
          backRequests,
          traversals,
        })),
      )
      .toMatchObject({
        generations: [expect.anything(), expect.objectContaining({ finished: 'resolved' })],
      })
    const recorded = await observation.evaluate(({ generations, traversals, backRequests }) => ({
      generations,
      traversals,
      backRequests,
    }))
    expect(recorded.generations).toHaveLength(2)
    expect(recorded.backRequests).toHaveLength(1)
    expect(recorded.backRequests[0]?.active).toBe(true)
    const traversal = recorded.traversals.find((event) => event.theme === 'light')
    expect(traversal?.active).toBe(true)
    expect(traversal?.firstUnfinished).toBe(true)
    const first = recorded.generations[0],
      second = recorded.generations[1]
    if (!first || !second || !traversal)
      throw new Error('Missing native transition ownership evidence')
    expect(first.ready).toBe('resolved')
    expect(first.finished).not.toBe('pending')
    expect(second.startedAt).toBeGreaterThanOrEqual(traversal.at)
    expect(second.ready).toBe('resolved')
    expect(second.finished).toBe('resolved')
    for (const generation of [first, second]) {
      expect(generation.guardedBeforeSnapshot).toBe(true)
      expect(generation.guardedUntilFinished).toBe(true)
      expect(generation.samples.every((sample) => sample.suppressed)).toBe(true)
      expect(
        generation.samples.some((sample) => sample.oldOpacity > 0 && sample.oldOpacity < 1),
      ).toBe(true)
      expect(
        generation.samples.some((sample) => sample.newOpacity > 0 && sample.newOpacity < 1),
      ).toBe(true)
      expect(generation.samples.every((sample) => sample.duration === '0.18s')).toBe(true)
    }
    await expect(theme).toContainText('Light')
    await expect(page.locator('html')).not.toHaveClass(/dark/u)
    await expectNoOwner(page)
  } finally {
    await observation.evaluate(({ dispose }) => dispose())
    await observation.dispose()
  }
})

for (const fallback of ['reduced-motion', 'no-api'] as const) {
  test(`theme ${fallback} applies instantly and releases temporary suppression`, async ({
    page,
  }) => {
    await page.emulateMedia({
      reducedMotion: fallback === 'reduced-motion' ? 'reduce' : 'no-preference',
      colorScheme: 'light',
    })
    if (fallback === 'no-api') {
      await page.addInitScript(() =>
        Object.defineProperty(document, 'startViewTransition', {
          configurable: true,
          value: undefined,
        }),
      )
    }
    await page.goto('/components/input?theme=light')
    const theme = page
      .locator('#site-customizer')
      .getByRole('combobox', { name: 'Theme', exact: true })
    await expect(theme).toContainText('Light')
    await page.keyboard.press('t')
    await expect(theme).toContainText('Dark')
    await expect(page).toHaveURL(/[?&]theme=dark(?:&|$)/u)
    await expectNoOwner(page)
    await page.locator('#site-customizer').getByRole('combobox', { name: 'Radius' }).click()
    await expect(page.getByRole('listbox')).toBeVisible()
    const observation = await observeTheme(page)
    try {
      await page.evaluate(() => history.back())
      await expect(theme).toContainText('Light')
      await expect(page.locator('html')).not.toHaveClass(/dark/u)
      await expectNoOwner(page)
      expect(await observation.evaluate(({ samples }) => samples)).toEqual([])
      expect(await observation.evaluate(({ transient }) => transient.some(Boolean))).toBe(true)
      const suppression = await observation.evaluate(({ suppression }) => suppression)
      expect(suppression.length).toBeGreaterThan(0)
      expect(
        suppression.every((consumers) =>
          consumers.every(({ property, duration }) => property === 'none' && duration === '0s'),
        ),
      ).toBe(true)
      expect(await observation.evaluate(({ mutations }) => mutations)).toContain('childList')
      expect(await observation.evaluate(({ released }) => released())).toBe(true)
      await expectNoOwner(page)
    } finally {
      await observation.evaluate(({ dispose }) => dispose())
      await observation.dispose()
    }
  })
}
