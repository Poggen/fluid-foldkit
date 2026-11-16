import { expect, test } from '@playwright/test'

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`global radius preserves a draft and respects ${reducedMotion} motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion })
    await page.goto('/components/input')
    await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
    const input = page.locator('.reference-preview #preview-input').first()
    await input.fill('Retain this unfinished draft')
    await input.evaluate((element) => element.setAttribute('data-retained-draft', 'true'))
    const copy = page.locator('#site-customizer').getByRole('button', {
      name: 'Copy install prompt',
      exact: true,
    })
    const observation = await copy.evaluateHandle((element) => {
      const samples: number[] = []
      const durations: string[] = []
      let frame = 0
      const changed = (event: Event) => {
        if (
          !(event instanceof TransitionEvent) ||
          event.target !== element ||
          event.propertyName !== 'border-top-left-radius'
        )
          return
        durations.push(getComputedStyle(element).transitionDuration)
        const until = performance.now() + 400
        const sample = () => {
          samples.push(Number.parseFloat(getComputedStyle(element).borderTopLeftRadius))
          if (performance.now() < until) frame = requestAnimationFrame(sample)
        }
        frame = requestAnimationFrame(sample)
      }
      element.addEventListener('transitionrun', changed)
      return {
        samples,
        durations,
        dispose: () => {
          cancelAnimationFrame(frame)
          element.removeEventListener('transitionrun', changed)
        },
      }
    })
    try {
      await page.locator('#site-customizer').getByRole('combobox', { name: 'Radius' }).click()
      await page.getByRole('option', { name: 'Rounded', exact: true }).click()
      await expect(copy).toHaveCSS('border-top-left-radius', '8px')
      await expect(page.locator('[data-shape-transition]')).toHaveCount(0)
      expect(await observation.evaluate(({ samples }) => samples.some((r) => r > 1 && r < 8))).toBe(
        reducedMotion === 'no-preference',
      )
      const durations = await observation.evaluate(({ durations }) => durations)
      if (reducedMotion === 'no-preference') {
        expect(durations.length).toBeGreaterThan(0)
        expect(
          durations.every((value) => value.split(',').every((part) => part.trim() === '0.18s')),
        ).toBe(true)
      } else {
        expect(durations).toEqual([])
      }
      await expect(page.locator('html')).not.toHaveClass(/\btransitioning\b/u)
      await expect(input).toHaveValue('Retain this unfinished draft')
      await expect(input).toHaveAttribute('data-retained-draft', 'true')
      await expect(page).toHaveURL(/[?&]shape=rounded(?:&|$)/u)
      await page.locator('#site-customizer').getByRole('combobox', { name: 'Accent' }).click()
      const accentPanel = page.getByRole('listbox', { name: 'Accent', exact: true })
      await expect(accentPanel).toBeVisible()
      const policy = await accentPanel.evaluateHandle((portal) => {
        const root = document.documentElement
        if (portal.closest('.site')) throw new Error('Expected a real portalled control')
        const samples: { property: string; duration: string; timing: string }[][] = []
        const mutations: string[] = []
        const observer = new MutationObserver((records) => {
          mutations.push(...records.map((record) => record.type))
          if (root.classList.contains('transitioning') && portal.isConnected) {
            samples.push(
              [document.body, portal].flatMap((element) =>
                [null, '::before', '::after'].map((pseudo) => {
                  const computed = getComputedStyle(element, pseudo)
                  return {
                    property: computed.transitionProperty,
                    duration: computed.transitionDuration,
                    timing: computed.transitionTimingFunction,
                  }
                }),
              ),
            )
          }
        })
        observer.observe(root, {
          attributes: true,
          attributeFilter: ['class'],
        })
        return {
          samples,
          mutations,
          retained: () => root.isConnected,
          dispose: () => observer.disconnect(),
        }
      })
      try {
        await page.evaluate(() => history.back())
        await expect(copy).toHaveCSS('border-top-left-radius', '1px')
        await expect(page.locator('html')).not.toHaveClass(/\btransitioning\b/u)
        const samples = await policy.evaluate(({ samples }) => samples)
        expect(samples.length).toBeGreaterThan(0)
        for (const consumers of samples) {
          for (const consumer of consumers) {
            if (reducedMotion === 'reduce') {
              expect(consumer.property).toBe('none')
              expect(consumer.duration).toBe('0s')
            } else {
              expect(consumer.property.split(',').map((property) => property.trim())).toEqual([
                'border-radius',
                'background-color',
                'color',
                'border-color',
                'fill',
                'stroke',
              ])
              expect(consumer.duration.split(',').every((value) => value.trim() === '0.18s')).toBe(
                true,
              )
              expect(
                consumer.timing.split(',').every((value) => value.trim() === 'ease-in-out'),
              ).toBe(true)
            }
          }
        }
        expect(await policy.evaluate(({ mutations }) => mutations)).toContain('attributes')
        expect(await policy.evaluate(({ mutations }) => mutations)).not.toContain('childList')
        expect(await policy.evaluate(({ retained }) => retained())).toBe(true)
      } finally {
        await policy.evaluate(({ dispose }) => dispose())
        await policy.dispose()
      }
      await page.keyboard.press('Escape')
      await page.evaluate(() => history.forward())
      await expect(copy).toHaveCSS('border-top-left-radius', '8px')
      await expect(page.locator('[data-shape-transition]')).toHaveCount(0)
    } finally {
      await observation.evaluate(({ dispose }) => dispose())
      await observation.dispose()
    }
    await page.reload()
    await expect(copy).toHaveCSS('border-top-left-radius', '8px')
    await expect(page.locator('[data-shape-transition]')).toHaveCount(0)
  })
}

test('global settings settle after returning to the populated landing page', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('[data-live-previews="true"]')).toBeVisible()
  const customizer = page.locator('#site-customizer')
  const choose = async (label: string, value: string) => {
    const control = customizer.getByRole('combobox', { name: label, exact: true })
    await control.click()
    await page.getByRole('option', { name: value, exact: true }).click()
    await expect(control).toHaveAttribute('aria-expanded', 'false')
  }
  const notifications = page.getByRole('switch', { name: 'Notifications', exact: true })
  await notifications.click()
  await expect(notifications).toHaveAttribute('aria-checked', 'false')
  const inputCard = page.locator('[data-component="fluid/input"]')
  await inputCard.scrollIntoViewIfNeeded()
  const input = inputCard.getByRole('textbox').first()
  await input.fill('Keep this draft')
  await choose('Radius', 'Rounded')
  await choose('Theme', 'Dark')
  await choose('Accent', 'Green')
  await choose('Heading font', 'Geist Serif')
  await choose('Size', 'Compact')
  await choose('Hover', 'Standard')
  await page.locator('[data-component="fluid/slider"]').scrollIntoViewIfNeeded()
  const volume = page.getByRole('slider', { name: 'Volume', exact: true })
  await volume.press('ArrowRight')
  await expect(volume).toHaveAttribute('aria-valuenow', '61')
  await expect(input).toHaveValue('Keep this draft')
  await expect(notifications).toHaveAttribute('aria-checked', 'false')
  const navigation = page.locator('#site-navigation')
  await navigation.getByRole('link', { name: 'Input', exact: true }).click()
  await expect(page.locator('[data-reference-page]')).toHaveAttribute(
    'data-reference-page',
    'fluid/input',
  )
  await navigation.getByRole('link', { name: 'Showcase', exact: true }).click()
  await expect(page.locator('[data-reference-page]')).toHaveCount(0)
  await inputCard.scrollIntoViewIfNeeded()
  await expect(input).toHaveValue('')
  const switchCard = page.locator('[data-component="fluid/switch"]')
  await switchCard.scrollIntoViewIfNeeded()
  await expect(switchCard).toHaveAttribute('data-deferred', 'false')
  await expect(notifications).toHaveAttribute('aria-checked', 'true')
  await input.fill('New visit draft')
  await customizer.getByRole('button', { name: 'Reset customization', exact: true }).click()
  await expect(page.locator('.site')).toHaveAttribute('data-shape', 'sharp')
  await expect(page.locator('.site')).toHaveAttribute('data-size', 'default')
  await expect(input).toHaveValue('New visit draft')
  for (const radius of ['Pill', 'Rounded', 'Sharp']) {
    await choose('Radius', radius)
    await expect(page.locator('.site')).toHaveAttribute('data-shape', radius.toLowerCase())
  }
  await expect(page.locator('[data-shape-transition]')).toHaveCount(0)
})
