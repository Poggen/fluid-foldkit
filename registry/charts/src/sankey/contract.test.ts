import { createPaintFeed } from './paint-feed'
import type { SankeyActions } from './context'
import type { SankeyPropNode, SankeyPropLink } from './types'
import { renderChartSvg } from '@tanstack/charts/svg'
import { SankeyNode, SankeyLink } from './carriers'
import type { SankeyChartProps } from './props'
import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Block, Story } from 'foldkit'
import { Effect, Schema } from 'effect'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { defineChart } from '@tanstack/charts/scene'
import { createSankeyMark } from './marks'
import { SankeyChart } from './index'
import { sankeyDefinition, sankeyPlan, sanitizeSankeyData } from './build'
import { sankeyHoverSets } from './hover-css'
import { scopePatterns } from './resources'
it('preserves pinned source weighted-layout coordinates and label baselines in the real engine', () => {
  const mark = createSankeyMark({
    now: () => 0,
    data: {
      nodes: [{ name: 'Start', category: 'source' }, { name: 'End' }],
      links: [{ source: 0, target: 1, value: 12 }],
    },
    nodeWidth: 16,
    nodePadding: 24,
    sideMargin: { left: 180, right: 180 },
    nodeColor: () => 'red',
    linkStroke: () => 'blue',
    useGradient: false,
    strokeOpacity: 0.5,
    lineCap: 4,
    showLabels: true,
    showValueLabels: true,
    labelOrientation: 'horizontal',
    enter: { durationMs: 1100, transition: { type: 'tween', duration: 1100 } },
  })
  const runtime = createChartRuntime()
  try {
    const scene = runtime.render(
      defineChart({
        marks: [mark],
        margin: { top: 40, right: 0, bottom: 40, left: 0 },
        scales: { x: null, y: null },
      }),
      { width: 630, height: 315 },
    )
    expect(scene.points.map((point) => [point.markId, point.x, point.y])).toEqual([
      ['sankey:flow', 315, 157.5],
      ['sankey:sankey-node-0', 188, 157.5],
      ['sankey:sankey-node-1', 442, 157.5],
      ['sankey:nlabel', 168, 158.5972],
      ['sankey:nlabel', 462, 158.5972],
      ['sankey:vlabel', 168, 174.4284],
      ['sankey:vlabel', 462, 174.4284],
    ])
  } finally {
    runtime.destroy()
  }
})
it('retains connected-flow hover, invalid-flow normalization, caller metadata and scoped resource links', () => {
  const links = [
    { source: 0, target: 1, value: 12 },
    { source: 0, target: 2, value: -1 },
    { source: 2, target: 3, value: NaN },
  ]
  const data = {
    nodes: [
      { name: 'Start', custom: () => 42 },
      { name: 'End' },
      { name: 'Other' },
      { name: 'Last' },
    ],
    links,
  }
  const normalized = sanitizeSankeyData(data)
  expect(normalized.links.map((link) => link.value)).toEqual([12, 0, 0])
  expect(normalized.nodes).toBe(data.nodes)
  expect(
    sanitizeSankeyData({ nodes: data.nodes, links: [{ source: 0, target: 1, value: 0 }] }),
  ).toEqual({ nodes: [], links: [] })
  expect(sankeyHoverSets(links, { node: 2 })).toEqual({ nodes: [2, 0, 3], links: [1, 2] })
  const scoped = scopePatterns(
    [
      {
        tag: 'pattern',
        attributes: { id: 'copy', href: '#base' },
        children: [{ tag: 'use', attributes: { 'xlink:href': '#copy' } }],
      },
    ],
    'one-',
  )
  expect(scoped[0]?.attributes).toEqual({ id: 'one-copy', href: '#one-base' })
  expect(scoped[0]?.children?.[0]).toEqual({
    tag: 'use',
    attributes: { 'xlink:href': '#one-copy' },
    children: [],
  })
})
it.effect(
  'does not reinterpret native observations as new imperative focus requests and JSON-round-trips all state',
  () => {
    const chart = SankeyChart({ name: 'sankey-json-contract' })
    const Key = Symbol('SankeyContract')
    const Definition = Block.make(chart.namespace, { ...chart.contract, key: Key })
    return Effect.gen(function* () {
      const model = yield* Story.story(
        { block: Definition, layer: Definition.makeLayer(chart.plans<typeof Key>(Definition)) },
        Story.init('json'),
        Story.inMessage(Definition.InMessage.RequestedFocus({ kind: 'link', index: 0 })),
        Story.model((model) => expect(model.focusRevision).toBe(1)),
        Story.message(Definition.Message.ObservedFocus({ kind: 'node', index: 1 })),
        Story.expectOutMessage(Definition.OutMessage.NodeHoverChanged({ index: 1 })),
        Story.model((model) => {
          expect(model.focusedKind).toBe('node')
          expect(model.focusRevision).toBe(1)
        }),
      )
      const codec = Schema.fromJsonString(Schema.toCodecJson(Definition.Model))
      const wire = yield* Schema.encodeEffect(codec)(model)
      expect(yield* Schema.decodeEffect(codec)(wire)).toEqual(model)
    })
  },
)

it.effect(
  'keeps graph highlight requests, controlled node state and tooltip reset independent',
  () => {
    const chart = SankeyChart({ name: 'sankey-highlight-tooltip-contract' })
    const Key = Symbol('SankeyContract')
    const Definition = Block.make(chart.namespace, { ...chart.contract, key: Key })
    const props: SankeyChartProps = {
      data: { nodes: [{ name: 'A' }, { name: 'B' }], links: [{ source: 0, target: 1, value: 12 }] },
    }
    const actions: SankeyActions<typeof Definition.InMessage.Type> = {
      focusNode: (index: number | null) =>
        Definition.InMessage.RequestedFocus({ kind: 'node', index }),
      focusLink: (index: number | null) =>
        Definition.InMessage.RequestedFocus({ kind: 'link', index }),
      tooltip: Definition.InMessage.RequestedTooltip,
    }
    const tooltip = Definition.InMessage.RequestedTooltip({
      kind: 'node',
      index: 0,
      anchor: { x: 100, y: 80 },
    })
    const clearTooltip = Definition.InMessage.RequestedTooltip({ kind: 'none', index: null })
    return Effect.gen(function* () {
      const subject = {
        block: Definition,
        layer: Definition.makeLayer(chart.plans<typeof Key>(Definition)),
      }
      const selected = yield* Story.story(
        subject,
        Story.init('highlight-tooltip'),
        Story.inMessage(actions.focusNode(0)),
        Story.model((model) => {
          expect(chart.context(props, model, actions, null).hoveredNodeIndex).toBe(0)
          expect(chart.context(props, model, actions, null).tooltipData).toBeNull()
        }),
        Story.message(Definition.Message.ObservedFocus({ kind: 'node', index: 1 })),
        Story.model((model) => {
          const visible = chart.context(props, model, actions, null)
          expect(visible.tooltipData?.nodeIndex).toBe(1)
          expect(
            visible.requestTooltip({ kind: 'node', index: 0, anchor: { x: 100, y: 80 } }),
          ).toEqual(tooltip)
        }),
        Story.inMessage(tooltip),
        Story.model((model) => {
          const selected = chart.context(props, model, actions, null)
          expect(selected.tooltipData).toMatchObject({
            nodeIndex: 0,
            x: 100,
            y: 80,
            data: { name: 'A' },
          })
          expect(selected.tooltipData?.data).toBe(selected.nodes[0])
          expect(selected.requestTooltip({ kind: 'none', index: null })).toEqual(clearTooltip)
        }),
      )
      const codec = Schema.fromJsonString(Schema.toCodecJson(Definition.Model))
      const wire = yield* Schema.encodeEffect(codec)(selected)
      expect(yield* Schema.decodeEffect(codec)(wire)).toEqual(selected)
      yield* Story.story(
        subject,
        Story.given(selected),
        Story.inMessage(clearTooltip),
        Story.model((model) => {
          const cleared = chart.context(props, model, actions, null)
          expect(cleared.tooltipData).toBeNull()
          expect(cleared.hoveredNodeIndex).toBe(1)
        }),
        Story.inMessage(actions.focusLink(0)),
        Story.model((model) => {
          const combined = chart.context(props, model, actions, null)
          expect(combined.hoveredNodeIndex).toBe(1)
          expect(combined.hoveredLinkIndex).toBe(0)
        }),
        Story.inMessage(actions.focusNode(null)),
        Story.model((model) =>
          expect(chart.context(props, model, actions, null).hoveredLinkIndex).toBe(0),
        ),
        Story.inMessage(actions.focusNode(1)),
        Story.message(Definition.Message.ObservedNodeControl({ controlled: true })),
        Story.inMessage(actions.focusNode(0)),
        Story.model((model) => {
          expect(model.hoveredNodeIndex).toBe(1)
          const controlled = chart.context({ ...props, hoveredNodeIndex: 0 }, model, actions, null)
          expect(controlled.hoveredNodeIndex).toBe(0)
          expect(controlled.tooltipData).toBeNull()
        }),
        Story.message(
          Definition.Message.ObservedFocus({ kind: 'link', index: 0, nodeControlled: true }),
        ),
        Story.expectNoOutMessage(),
        Story.model((model) => {
          expect(model.hoveredNodeIndex).toBe(1)
          expect(chart.context(props, model, actions, null).tooltipData?.type).toBe('link')
        }),
      )
    })
  },
)

it.effect('emits every controlled node request while keeping observation outputs distinct', () => {
  const chart = SankeyChart({ name: 'sankey-controlled-request-contract' })
  const Key = Symbol('SankeyContract')
  const Definition = Block.make(chart.namespace, { ...chart.contract, key: Key })
  const request = (index: number | null) =>
    Definition.InMessage.RequestedFocus({ kind: 'node', index })
  const subject = {
    block: Definition,
    layer: Definition.makeLayer(chart.plans<typeof Key>(Definition)),
  }
  return Effect.gen(function* () {
    yield* Story.story(
      subject,
      Story.init('uncontrolled-request'),
      Story.inMessage(request(0)),
      Story.expectNoOutMessage(),
    )
    yield* Story.story(
      subject,
      Story.init('requests'),
      Story.message(Definition.Message.ObservedNodeControl({ controlled: true })),
      ...[0, 0, 1, null].map((index) =>
        Story.steps(
          Story.inMessage(request(index)),
          Story.expectOutMessage(Definition.OutMessage.NodeHoverRequested({ index })),
        ),
      ),
      Story.model((model) => expect(model.hoveredNodeIndex).toBeNull()),
      Story.models(
        Story.steps(
          Story.message(Definition.Message.ObservedNodeHoverRequest({ index: 1 })),
          Story.expectOutMessage(Definition.OutMessage.NodeHoverRequested({ index: 1 })),
        ),
        (before, after) => expect(after).toBe(before),
      ),
      Story.message(
        Definition.Message.ObservedFocus({ kind: 'node', index: 1, nodeControlled: true }),
      ),
      Story.expectOutMessage(Definition.OutMessage.NodeHoverChanged({ index: 1 })),
    )
  })
})

it('passes the complete laid-out callback graph instead of truncated raw input rows', () => {
  const nodes: Array<SankeyPropNode> = [],
    links: Array<SankeyPropLink> = []
  const runtime = createChartRuntime()
  try {
    const scene = runtime.render(
      sankeyDefinition(
        {
          data: {
            nodes: [{ name: 'A', note: 'kept' }, { name: 'B' }],
            links: [{ source: 0, target: 1, value: 12, note: 'kept' }],
          },
          margin: { left: 80, right: 80 },
          children: [
            SankeyNode({
              getNodeColor: (node) => {
                nodes.push(node)
                return 'red'
              },
            }),
            SankeyLink({
              useGradient: false,
              getLinkColor: (link) => {
                links.push(link)
                return typeof link.source === 'object' && link.source.name === 'A' ? 'blue' : 'pink'
              },
            }),
          ],
        },
        'callbacks',
        () => undefined,
        () => 0,
      ),
      { width: 630, height: 315 },
    )
    expect(renderChartSvg(scene, { ariaLabel: 'Callback graph' })).toContain('stroke="blue"')
    expect(nodes[0]).toMatchObject({
      name: 'A',
      note: 'kept',
      index: 0,
      value: 12,
      x0: 0,
      x1: 16,
      y0: 0,
      y1: 235,
    })
    const link = links[0]
    if (link === undefined || typeof link.source !== 'object' || typeof link.target !== 'object')
      throw new Error('Missing laid-out node endpoints')
    expect(link).toMatchObject({
      index: 0,
      value: 12,
      note: 'kept',
      y0: 117.5,
      y1: 117.5,
      width: 235,
    })
    expect(link.source.sourceLinks).toContain(link)
    expect(link.target.targetLinks).toContain(link)
  } finally {
    runtime.destroy()
  }
})
it('resolves gradient colors from laid-out node callbacks with scoped user-space endpoints', () => {
  const props: SankeyChartProps = {
    data: { nodes: [{ name: 'A' }, { name: 'B' }], links: [{ source: 0, target: 1, value: 12 }] },
    margin: { left: 80, right: 80 },
    children: [SankeyLink({ getNodeColor: (node) => ((node.x0 ?? 0) > 0 ? 'blue' : 'red') })],
  }
  const feed = createPaintFeed(),
    runtime = createChartRuntime()
  try {
    const scene = runtime.render(
      sankeyDefinition(
        props,
        'gradient',
        () => undefined,
        () => 0,
        sankeyPlan(props),
        feed,
      ),
      { width: 630, height: 315 },
    )
    expect(feed.gradients).toEqual([
      {
        tag: 'linearGradient',
        attributes: {
          id: 'gradient-sankey-flow-0-role-0',
          gradientUnits: 'userSpaceOnUse',
          x1: 96,
          x2: 534,
          y1: 0,
          y2: 0,
        },
        children: [
          { tag: 'stop', attributes: { offset: '0%', 'stop-color': 'red' } },
          { tag: 'stop', attributes: { offset: '100%', 'stop-color': 'blue' } },
        ],
      },
    ])
    expect(renderChartSvg(scene, { ariaLabel: 'Gradient graph' })).toContain(
      'url(#gradient-sankey-flow-0-role-0)',
    )
    const omitted = { ...props, children: [] }
    runtime.render(
      sankeyDefinition(
        omitted,
        'gradient',
        () => undefined,
        () => 0,
        sankeyPlan(omitted),
        feed,
      ),
      { width: 630, height: 315 },
    )
    expect(feed.gradients).toHaveLength(1)
    expect(feed.gradients[0]?.children).toEqual([
      { tag: 'stop', attributes: { offset: '0%', 'stop-color': 'var(--chart-1)' } },
      { tag: 'stop', attributes: { offset: '100%', 'stop-color': 'var(--chart-2)' } },
    ])
  } finally {
    runtime.destroy()
  }
})
