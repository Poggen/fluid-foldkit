import { expect, test } from '@playwright/test'
import { Effect } from 'effect'
import { renderSidebarSmallSource } from './sidebar-small-source-fixture.js'

for (const menu of [false, true]) {
  for (const peeking of [false, true]) {
    test(`SSR Workspace pin stacking and tab order (menu=${menu}, peeking=${peeking})`, async ({
      page,
    }) => {
      const rendered = await Effect.runPromise(renderSidebarSmallSource({ menu, peeking }))
      await page.goto('/components/sidebar')
      const stylesheets = await page
        .locator('link[rel="stylesheet"]')
        .evaluateAll((links) =>
          links.map((link) => link.getAttribute('href')).filter((href) => href !== null),
        )
      expect(stylesheets.length).toBeGreaterThan(0)
      await page.setContent(rendered.html)
      for (const url of stylesheets) await page.addStyleTag({ url })
      const pin = page.locator('#workspace-pin')
      await expect(pin).toHaveCSS('z-index', menu ? '20' : 'auto')
      await expect(pin).toHaveAttribute('tabindex', peeking ? '0' : '-1')
      await expect(pin).toHaveAttribute('aria-hidden', String(!peeking))
      await expect(pin).toHaveCSS('opacity', peeking ? '1' : '0')
      await expect(pin).toHaveCSS('transition-duration', '0.08s')
      await page.getByRole('button', { name: 'Before workspace', exact: true }).focus()
      await page.keyboard.press('Tab')
      if (peeking) await expect(pin).toBeFocused()
      else if (menu)
        await expect(
          page.getByRole('button', { name: 'Switch workspace', exact: true }),
        ).toBeFocused()
      else
        await expect(
          page.getByRole('button', { name: 'After workspace', exact: true }),
        ).toBeFocused()

      for (const name of ['Standalone group', 'Cluster group']) {
        const action = page.getByRole('button', { name, exact: true })
        await expect(action).toHaveCSS('z-index', 'auto')
        await expect(action).toHaveCSS('width', '24px')
        await expect(action).toHaveCSS('height', '24px')
        await expect(action).toHaveCSS('flex-shrink', '1')
        await expect(action).toHaveCSS('transition-duration', '0.08s')
        const properties = await action.evaluate((element) =>
          getComputedStyle(element)
            .transitionProperty.split(',')
            .map((property) => property.trim()),
        )
        expect(properties).toContain('color')
        expect(properties).toContain('background-color')
        expect(properties).not.toContain('opacity')
      }
      const standalone = page.getByRole('button', { name: 'Standalone group', exact: true })
      await expect(standalone).toHaveCSS('position', 'absolute')
      await expect(standalone).toHaveCSS('right', '14px')
      await expect(standalone).toHaveCSS('top', '12px')
      const override = page.getByRole('button', { name: 'Overridden group', exact: true })
      await expect(override).toHaveCSS('z-index', '20')
      await expect(override).toHaveCSS('flex-shrink', '0')
      await expect(override).toHaveCSS('transition-property', 'opacity')
      const menuAction = page.getByRole('button', { name: 'Standalone menu', exact: true })
      await expect(menuAction).toHaveCSS('z-index', '10')
      await expect(menuAction).toHaveCSS('transition-property', 'color, background-color, opacity')
      await expect(page.getByRole('button', { name: 'Cluster menu', exact: true })).toHaveCSS(
        'flex-shrink',
        '0',
      )
    })
  }
}
