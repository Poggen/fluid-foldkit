import { test, type Browser } from '@e2e-dev/web'
import { expect } from 'e2e'
import { mkdir, writeFile } from 'node:fs/promises'

type ControlCase = {
  role: 'spinbutton' | 'textbox' | 'switch' | 'combobox'
  name: string
  value: string
}

const cases: Readonly<Record<string, readonly ControlCase[]>> = {
  gauge: [
    { role: 'combobox', name: 'Gauge orientation', value: 'Linear' },
    { role: 'combobox', name: 'Label placement', value: 'Top' },
    { role: 'combobox', name: 'Label align', value: 'Start' },
    { role: 'spinbutton', name: 'Value', value: '25' },
  ],
  line: [
    { role: 'spinbutton', name: 'Height', value: '330' },
    { role: 'spinbutton', name: 'Stroke width', value: '4' },
    { role: 'switch', name: 'Show grid', value: 'false' },
    { role: 'switch', name: 'Show axis', value: 'false' },
  ],
  area: [
    { role: 'spinbutton', name: 'Height', value: '330' },
    { role: 'switch', name: 'Show grid', value: 'false' },
    { role: 'switch', name: 'Show axis', value: 'false' },
  ],
  bar: [
    { role: 'spinbutton', name: 'Height', value: '330' },
    { role: 'switch', name: 'Show grid', value: 'false' },
    { role: 'switch', name: 'Show axis', value: 'false' },
  ],
  composed: [
    { role: 'spinbutton', name: 'Height', value: '330' },
    { role: 'switch', name: 'Show grid', value: 'false' },
    { role: 'switch', name: 'Show axis', value: 'false' },
  ],
  scatter: [
    { role: 'spinbutton', name: 'Height', value: '330' },
    { role: 'switch', name: 'Show grid', value: 'false' },
    { role: 'switch', name: 'Show axis', value: 'false' },
  ],
  candlestick: [
    { role: 'spinbutton', name: 'Height', value: '330' },
    { role: 'switch', name: 'Show grid', value: 'false' },
    { role: 'switch', name: 'Show axis', value: 'false' },
  ],
  pie: [{ role: 'spinbutton', name: 'Inner radius', value: '20' }],
  ring: [
    { role: 'spinbutton', name: 'Stroke width', value: '24' },
    { role: 'spinbutton', name: 'Ring gap', value: '14' },
    { role: 'spinbutton', name: 'Base inner radius', value: '55' },
  ],
  radar: [{ role: 'switch', name: 'Show labels', value: 'false' }],
  funnel: [
    { role: 'combobox', name: 'Edges', value: 'Straight' },
    { role: 'combobox', name: 'Label layout', value: 'Grouped' },
    { role: 'combobox', name: 'Orientation', value: 'Vertical' },
    { role: 'switch', name: 'Show labels', value: 'false' },
    { role: 'switch', name: 'Show value', value: 'false' },
  ],
  heatmap: [{ role: 'combobox', name: 'Aspect ratio', value: '1 / 1' }],
  'live-line': [{ role: 'spinbutton', name: 'Height', value: '330' }],
  sunburst: [{ role: 'spinbutton', name: 'Size', value: '340' }],
  sankey: [
    { role: 'combobox', name: 'Aspect ratio', value: '1 / 1' },
    { role: 'spinbutton', name: 'Node width', value: '20' },
    { role: 'spinbutton', name: 'Node padding', value: '20' },
  ],
  choropleth: [{ role: 'spinbutton', name: 'Scale', value: '80' }],
  brush: [{ role: 'spinbutton', name: 'Height', value: '140' }],
  legend: [
    { role: 'switch', name: 'Show progress', value: 'true' },
    { role: 'switch', name: 'Show value', value: 'false' },
    { role: 'switch', name: 'Show marker', value: 'false' },
    { role: 'switch', name: 'Show percentage', value: 'true' },
  ],
  'tooltip-box': [
    { role: 'textbox', name: 'Label', value: 'Costs' },
    { role: 'spinbutton', name: 'Value', value: '25' },
  ],
  'series-point-marker': [{ role: 'spinbutton', name: 'Radius', value: '12' }],
  'stat-flow': [{ role: 'spinbutton', name: 'Value', value: '20000' }],
  'bar-skeleton': [{ role: 'spinbutton', name: 'Bar count', value: '20' }],
}

const visibleResult = (browser: Browser) =>
  browser.evaluate(() => {
    const host = document.querySelector<HTMLElement>(
      '.reference-preview [data-component^="charts/"]',
    )
    const chart = host?.querySelector('svg')
    const box = chart?.getBoundingClientRect()
    return {
      markup: host?.innerHTML ?? '',
      text: host?.textContent ?? '',
      svgWidth: Math.round(box?.width ?? 0),
      svgHeight: Math.round(box?.height ?? 0),
    }
  })

type VisibleResult = Awaited<ReturnType<typeof visibleResult>>

for (const [slug, controls] of Object.entries(cases)) {
  test(
    `${slug} controls change the rendered chart`,
    { tags: ['charts', 'control-effects'] },
    async ({ app, browser, screen }) => {
      await app.open(`/charts/${slug}`)
      const host = browser.locator(`.reference-preview [data-component="charts/${slug}"]`)
      await host.scrollIntoView()
      await expect(host).toBeVisible()
      const aside = browser.locator('aside.playground-controls')
      const results: {
        control: string
        changed: boolean
        before: VisibleResult
        after: VisibleResult
      }[] = []
      for (const control of controls) {
        await aside.getByRole('button', 'Reset').tap()
        const before = await visibleResult(browser)
        const target = aside.getByRole(control.role, control.name)
        if (control.role === 'combobox') {
          await target.tap()
          await screen.getByRole('option', control.value).tap()
        } else if (control.role === 'switch') {
          if (control.value === 'true') await target.check()
          else await target.uncheck()
        } else {
          await target.fill(control.value)
        }
        await expect.poll(async () => (await visibleResult(browser)).markup).not.toBe(before.markup)
        const after = await visibleResult(browser)
        results.push({
          control: control.name,
          changed: after.markup !== before.markup,
          before,
          after,
        })
      }
      await mkdir('.verification/component-bugbash/charts', { recursive: true })
      await writeFile(
        `.verification/component-bugbash/charts/${slug}-control-effects.json`,
        JSON.stringify(
          results.map(({ control, changed, before, after }) => ({
            control,
            changed,
            before: { text: before.text, svgWidth: before.svgWidth, svgHeight: before.svgHeight },
            after: { text: after.text, svgWidth: after.svgWidth, svgHeight: after.svgHeight },
          })),
          null,
          2,
        ),
      )
    },
  )
}
