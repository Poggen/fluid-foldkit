import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { inertHtml as h } from 'foldkit/html'
import { renderToString } from 'foldkit/experimental/server'
import { TooltipContent, TooltipPanel, DateTicker, MarkerTooltipContent } from '../src/index'

const fixtures = {
  rows: TooltipContent({
    title: 'Revenue',
    rows: [
      { label: 'Revenue', color: '#ff5500', value: 1234 },
      { label: 'Cost', color: '#00aa88', value: 'estimated' },
    ],
    children: h.em([], ['Details']),
  }),
  box: TooltipPanel({
    className: 'custom-box',
    backgroundColor: 'pink',
    panelStyle: { padding: 12, opacity: 0.5 },
    children: h.strong([], ['Custom']),
  }),
  ticker: DateTicker({ labels: ['Jan 1', 'Jan 2'], currentIndex: 99, visible: true }),
  markers: MarkerTooltipContent({
    markers: [
      {
        title: 'Release',
        description: 'Production',
        icon: 0,
        color: '#ff5500',
        href: 'https://example.com',
      },
      { title: 'Custom', icon: '*', content: h.strong([], ['Custom detail']) },
      { title: 'Third' },
    ],
  }),
}

export const TooltipServerProbeKey = Symbol('TooltipServerProbe')

const Probe = Block.make('TooltipServerProbe', {
  key: TooltipServerProbeKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  Model: Schema.Struct({}),
  Message: Schema.Never,
  isMessageFree: true,
})

const TooltipServerProbeComposition = Probe.makeComposition({})

const layer = Probe.makeLayer({
  init: TooltipServerProbeComposition.makeInit(() => ({ model: {} })),
  update: TooltipServerProbeComposition.makeUpdate({}),
  view: TooltipServerProbeComposition.makeView((_model, builder) => ({
    title: 'Tooltip primitive server probe',
    body: builder.div(
      [],
      Object.entries(fixtures).map(([id, body]) => builder.section([builder.Id(id)], [body])),
    ),
  })),
})

const rendered = await Effect.runPromise(
  renderToString({ block: Probe, layer }, {}, { isHydratable: false }),
)

await Effect.runPromise(
  Effect.sync(() => process.stdout.write(`${JSON.stringify({ html: rendered.html })}\n`)),
)
