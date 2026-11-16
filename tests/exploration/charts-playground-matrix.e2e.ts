import { test, type Browser } from '@e2e-dev/web'
import { expect } from 'e2e'
import { mkdir, writeFile } from 'node:fs/promises'

const slugs = [
  'gauge',
  'line',
  'area',
  'bar',
  'composed',
  'pie',
  'ring',
  'radar',
  'funnel',
  'scatter',
  'candlestick',
  'heatmap',
  'live-line',
  'sunburst',
  'sankey',
  'choropleth',
  'brush',
  'legend',
  'tooltip-box',
  'series-point-marker',
  'stat-flow',
  'bar-skeleton',
] as const

const snapshot = (browser: Browser) =>
  browser.evaluate(() => {
    const preview = document.querySelector<HTMLElement>('.reference-preview')
    const props = document.querySelector<HTMLElement>('aside.playground-controls')
    const box = preview?.getBoundingClientRect()
    return {
      controls: [
        ...(props?.querySelectorAll('input,button[role="combobox"],[role="switch"]') ?? []),
      ].map((node) => {
        if (node instanceof HTMLInputElement)
          return `${node.id}:${node.type}:${node.type === 'checkbox' ? node.checked : node.value}`
        return `${node.getAttribute('id') ?? ''}:${node.getAttribute('role') ?? ''}:${node.getAttribute('aria-checked') ?? ''}:${node.textContent?.trim() ?? ''}`
      }),
      previewVisible: !!preview && getComputedStyle(preview).display !== 'none',
      previewWidth: box?.width ?? 0,
      previewHeight: box?.height ?? 0,
      chartHosts: preview?.querySelectorAll('[data-component^="charts/"]').length ?? 0,
      chartImages: preview?.querySelectorAll('[role="img"]').length ?? 0,
      chartPaths: preview?.querySelectorAll('svg path').length ?? 0,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1,
    }
  })

for (const slug of slugs) {
  test(
    `${slug} preserves a rendered playground through repeated Shuffle, Code and Reset`,
    { tags: ['charts', 'playground'] },
    async ({ app, browser, screen }) => {
      await app.open(`/charts/${slug}`)
      const playground = screen.getByRole('region', 'Playground')
      const preview = browser.locator('.reference-preview [data-component="charts/' + slug + '"]')
      await preview.scrollIntoView()
      await expect(preview).toBeVisible()
      const states: Awaited<ReturnType<typeof snapshot>>[] = [await snapshot(browser)]
      for (let index = 0; index < 3; index++) {
        await screen.getByRole('button', 'Shuffle').tap()
        await expect(preview).toBeVisible()
        states.push(await snapshot(browser))
      }
      await playground.getByRole('button', 'Code').tap()
      await expect(playground.getByRole('button', 'Code', { pressed: true })).toBeVisible()
      await playground.getByRole('button', 'Preview').tap()
      await expect(preview).toBeVisible()
      states.push(await snapshot(browser))
      await browser.locator('aside.playground-controls').getByRole('button', 'Reset').tap()
      await expect(preview).toBeVisible()
      await expect.poll(async () => (await snapshot(browser)).controls).toEqual(states[0]?.controls)
      states.push(await snapshot(browser))
      await mkdir('.verification/component-bugbash/charts', { recursive: true })
      await writeFile(
        `.verification/component-bugbash/charts/${slug}-playground.json`,
        JSON.stringify(states, null, 2),
      )
      if (
        states.some(
          (state) =>
            !state.previewVisible ||
            state.previewWidth < 100 ||
            state.previewHeight < 100 ||
            state.chartHosts < 1 ||
            state.horizontalOverflow,
        )
      ) {
        throw new Error(
          `${slug} playground lost its visible chart or overflowed: ${JSON.stringify(states)}`,
        )
      }
    },
  )
}
