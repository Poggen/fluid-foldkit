import type { Page } from '@playwright/test'
import { build } from 'vite'

export const loadBuiltStyles = async (page: Page, route: string, html: string) => {
  await page.goto(route)
  const stylesheets = await page
    .locator('link[rel="stylesheet"]')
    .evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')).filter((href) => href !== null),
    )
  const chartStyles = await page
    .locator('style[data-chart-styles]')
    .evaluateAll((styles) => styles.map((style) => style.textContent ?? '').filter(Boolean))
  if (stylesheets.length === 0) throw new Error('Normal production stylesheets are required')
  // setContent loses native pointer departure events in Linux headless Chromium.
  await page.route(page.url(), (route) => route.fulfill({ contentType: 'text/html', body: html }), {
    times: 1,
  })
  await page.reload()
  for (const url of stylesheets) await page.addStyleTag({ url })
  for (const content of chartStyles) await page.addStyleTag({ content })
  await page.evaluate(async () => {
    await document.fonts.ready
  })
}

export const bundleRuntimeFixture = async (entry: string) => {
  const result = await build({
    configFile: false,
    publicDir: false,
    logLevel: 'error',
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    resolve: { dedupe: ['effect', 'foldkit', '@foldkit/ui', '@effect/platform-browser'] },
    build: {
      write: false,
      minify: false,
      target: 'esnext',
      lib: { entry, formats: ['iife'], name: 'StyleContractFixture' },
    },
  })
  const outputs = Array.isArray(result) ? result : [result]
  const chunks: string[] = []
  for (const output of outputs) {
    if (!('output' in output)) throw new Error('Fixture build must produce an in-memory bundle')
    for (const file of output.output) {
      if (file.type === 'chunk') chunks.push(file.code)
      else if (file.fileName.endsWith('.css'))
        throw new Error('Fixture CSS would bypass normal production discovery')
    }
  }
  if (chunks.length !== 1) throw new Error('Fixture must produce exactly one script')
  return chunks[0] ?? ''
}

export const mountRuntimeFixture = async (
  page: Page,
  route: string,
  code: string,
  html = '<main id="style-contract-root"></main>',
) => {
  await loadBuiltStyles(page, route, html)
  await page.addScriptTag({ content: code })
}
