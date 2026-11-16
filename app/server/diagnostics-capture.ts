import { chromium, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { Array as EffectArray, Schema } from 'effect'
import type { TraceControl } from '../src/diagnostics/browser'

const Span = Schema.Struct({
  name: Schema.String,
  traceId: Schema.String,
  spanId: Schema.String,
  parentSpanId: Schema.optionalKey(Schema.String),
  startTimeUnixNano: Schema.String,
  endTimeUnixNano: Schema.String,
  attributes: Schema.Array(Schema.Struct({ key: Schema.String, value: Schema.Unknown })),
})
const Capture = Schema.Struct({
  totalBatches: Schema.Number,
  sanitized: Schema.Boolean,
  batches: Schema.Array(
    Schema.Struct({
      data: Schema.Struct({
        resourceSpans: Schema.Array(
          Schema.Struct({ scopeSpans: Schema.Array(Schema.Struct({ spans: Schema.Array(Span) })) }),
        ),
      }),
    }),
  ),
})
const site = process.env.DIAGNOSTICS_SITE ?? 'http://127.0.0.1:5490'
const collector = process.env.DIAGNOSTICS_COLLECTOR ?? 'http://127.0.0.1:5491'
const output = process.env.DIAGNOSTICS_REPORT ?? '.verification/observability/report'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const receipts = []
const failures: string[] = []
const browserExports: unknown[] = []
try {
  for (const scenario of ['color', 'size', 'search', 'typing']) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      colorScheme: 'light',
    })
    const page = await context.newPage()
    page.on('pageerror', (error) => failures.push(error.message))
    page.on('request', (request) => {
      if (request.url() === `${collector}/v1/traces`) {
        const body = request.postData()
        if (body !== null) browserExports.push(JSON.parse(body))
      }
    })
    const response = await page.goto(site)
    const traceparent = response?.headers()['x-showcase-traceparent']
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/u)
    await expect(page.locator('[data-live-previews=true]')).toBeVisible()
    await page.waitForFunction(() => window.__showcaseTracing !== undefined)
    const meta = await page.locator('meta[name="showcase-traceparent"]').getAttribute('content')
    expect(meta).toBe(traceparent)
    if (scenario === 'color')
      await page
        .getByRole('application', { name: 'Saturation and brightness' })
        .scrollIntoViewIfNeeded()
    if (scenario === 'size') {
      await page
        .locator('#site-customizer')
        .getByRole('combobox', { name: 'Size', exact: true })
        .press('Space')
      await expect(page.getByRole('option', { name: 'Compact', exact: true })).toBeVisible()
    }
    if (scenario === 'search') {
      await page
        .locator('#site-navigation')
        .getByRole('button', { name: 'Search', exact: true })
        .click()
      await expect(
        page.getByRole('dialog', { name: 'Search documentation' }).getByRole('combobox'),
      ).toBeFocused()
    }
    await page.evaluate(() => document.fonts.ready)
    const capture = await page.evaluate((name) => {
      const trace = window.__showcaseTracing
      if (!trace) throw Error('Missing diagnostic controller')
      return trace.start(name)
    }, scenario)
    if (scenario === 'color') {
      const square = page.getByRole('application', { name: 'Saturation and brightness' })
      const box = await square.boundingBox()
      if (!box) throw Error('Missing color square bounds')
      const hex = page.getByRole('textbox', { name: 'Hex value', exact: true })
      const before = await hex.inputValue()
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7, { steps: 12 })
      await page.mouse.up()
      await expect(hex).not.toHaveValue(before)
      await hex.fill('12ABEF')
      await hex.press('Tab')
      await expect(hex).toHaveValue('12ABEF')
    } else if (scenario === 'size') {
      await page.getByRole('option', { name: 'Compact', exact: true }).click()
      await expect(page.locator('.site')).toHaveAttribute('data-size', 'compact')
    } else if (scenario === 'search') {
      const dialog = page.getByRole('dialog', { name: 'Search documentation' })
      await dialog.getByRole('combobox').pressSequentially('calendar', { delay: 30 })
      await expect(dialog.getByRole('option', { name: 'Calendar', exact: true })).toBeVisible()
    } else {
      const input = page.getByRole('textbox', { name: 'Try the message composer', exact: true })
      await input.pressSequentially('trace probe', { delay: 30 })
      await expect(input).toHaveValue('trace probe')
      await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeEnabled()
    }
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    )
    const counts = await page.evaluate(async () => {
      const trace: TraceControl | undefined = window.__showcaseTracing
      if (!trace) throw Error('Missing diagnostic controller')
      const counts = await trace.stop()
      await trace.finish()
      return counts
    })
    expect(counts.count).toBeGreaterThan(0)
    expect(counts.dropped).toBe(0)
    receipts.push({ scenario, traceparent, capture, counts })
    await context.close()
  }
} finally {
  await browser.close()
}
await fetch(`${site}/__diagnostics/flush`, { method: 'POST' })
const raw: unknown = await (await fetch(`${collector}/captures`)).json()
const data = Schema.decodeUnknownSync(Capture)(raw)
const spans = data.batches.flatMap((batch) =>
  batch.data.resourceSpans.flatMap((resource) =>
    resource.scopeSpans.flatMap((scope) => scope.spans),
  ),
)
const exportedSpans = browserExports.flatMap((payload) =>
  Schema.decodeUnknownSync(Capture)({
    totalBatches: 1,
    sanitized: true,
    batches: [{ data: payload }],
  }).batches.flatMap((batch) =>
    batch.data.resourceSpans.flatMap((resource) =>
      resource.scopeSpans.flatMap((scope) => scope.spans),
    ),
  ),
)
expect(exportedSpans.some((span) => span.name.includes('ResolveWhole'))).toBe(true)
for (const span of exportedSpans) {
  for (const attribute of span.attributes) {
    expect(/^(?:showcase\.|foldkit\.|browser\.)/u.test(attribute.key)).toBe(true)
    expect(
      attribute.key === 'foldkit.model_revision' ||
        !/model|payload|argument|text|value/iu.test(attribute.key),
    ).toBe(true)
  }
}
const summary = receipts.map((receipt) => {
  const traceSpans = spans.filter((span) => span.traceId === receipt.capture.traceId)
  const session = traceSpans.find((span) => span.name === 'showcase.browser.session')
  const server = traceSpans.find((span) => span.name === 'showcase.ssr.request')
  expect(session?.parentSpanId).toBe(server?.spanId)
  expect(server).toBeDefined()
  const captureSpans = traceSpans.filter((span) => span.parentSpanId === receipt.capture.spanId)
  for (const name of ['foldkit.Update', 'foldkit.View', 'foldkit.Patch'])
    expect(
      captureSpans.some((span) => span.name === name),
      `${receipt.scenario}: ${name}`,
    ).toBe(true)
  expect(captureSpans.some((span) => span.name.startsWith('browser.input.'))).toBe(true)
  const grouped = EffectArray.groupBy(captureSpans, (span) => span.name)
  return {
    ...receipt,
    serverSpans: traceSpans.filter((span) => span.name.startsWith('showcase.ssr.')).length,
    spanCount: captureSpans.length,
    phases: Object.fromEntries(
      Object.entries(grouped).map(([name, values]) => [
        name,
        {
          count: values.length,
          totalMs: values.reduce(
            (sum, value) =>
              sum + Number(BigInt(value.endTimeUnixNano) - BigInt(value.startTimeUnixNano)) / 1e6,
            0,
          ),
        },
      ]),
    ),
  }
})
expect(data.sanitized).toBe(true)
expect(failures).toEqual([])
await writeFile(`${output}/otlp.json`, JSON.stringify(raw, null, 2))
await writeFile(`${output}/browser-export.json`, JSON.stringify(browserExports, null, 2))
const first = spans.reduce(
  (time, span) => {
    const start = BigInt(span.startTimeUnixNano)
    return start < time ? start : time
  },
  BigInt(spans[0]?.startTimeUnixNano ?? '0'),
)
const lanes = new Map<string, number>()
const traceEvents = spans.map((span) => {
  const lane =
    span.name.startsWith('foldkit.') || span.name.startsWith('browser.')
      ? span.name
      : span.name.startsWith('showcase.ssr.')
        ? 'server'
        : 'commands and lifecycle'
  if (!lanes.has(lane)) lanes.set(lane, lanes.size + 1)
  return {
    name: span.name,
    cat: lane,
    ph: 'X',
    pid: 1,
    tid: lanes.get(lane),
    ts: Number(BigInt(span.startTimeUnixNano) - first) / 1000,
    dur: Number(BigInt(span.endTimeUnixNano) - BigInt(span.startTimeUnixNano)) / 1000,
    args: {
      traceId: span.traceId,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      attributes: span.attributes,
    },
  }
})
await writeFile(
  `${output}/timeline.json`,
  JSON.stringify({
    traceEvents: [
      ...[...lanes].map(([name, tid]) => ({
        name: 'thread_name',
        ph: 'M',
        pid: 1,
        tid,
        args: { name },
      })),
      ...traceEvents,
    ],
    displayTimeUnit: 'ms',
  }),
)
await writeFile(
  `${output}/summary.json`,
  JSON.stringify({ failures, summary, totalSpans: spans.length }, null, 2),
)
console.log(JSON.stringify({ failures, summary, totalSpans: spans.length }, null, 2))
