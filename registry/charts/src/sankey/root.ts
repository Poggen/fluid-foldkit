import { cn } from '../kit/classes'

import { createPaintFeed } from './paint-feed'
import { inertHtml as h } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import { contentChildren } from './content'
import type { NativeContent } from './content'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { renderChartSvg } from '@tanstack/charts/svg'
import type { SankeyDatum } from './marks'
import { sankeyRecipe } from './block'
import type { Inputs, State } from './block'
import { SankeyHost, ratio } from './host'
import type { SankeyChartProps } from './props'
import { sankeyDefinition, sankeyPlan, formatSankeyInt } from './build'

import { resourceHtml, scopePatterns } from './resources'
import { sankeyContext } from './context'
import type { SankeyActions, SankeyContextValue } from './context'

const nativeContent: (argument0: {
  title: string
  rows: ReadonlyArray<{ color: string; label: string; value: string }>
}) => ReadonlyArray<Html> = function nativeContent({
  title,
  rows,
}: {
  title: string
  rows: ReadonlyArray<{ color: string; label: string; value: string }>
}) {
  const titleHtml = h.div(
    [
      h.Class(
        cn(
          'flex items-center [gap:.4rem] [font-weight:650] ts-chart-tooltip__title',
          rows.length ? '[margin-bottom:.3rem]' : 'mb-0',
        ),
      ),
    ],
    [title],
  )

  const rowHtml = rows.map((row) =>
    h.div(
      [
        h.Class(
          [
            'grid [grid-template-columns:.55rem_minmax(0,1fr)_auto] items-center [column-gap:.4rem]',
            'ts-chart-tooltip__row',
          ]
            .filter(Boolean)
            .join(' '),
        ),
        h.DataAttribute('active', 'false'),
      ],
      [
        h.span([
          h.Class(
            [
              'inline-block [width:.55rem] [height:.55rem] [border-radius:9999px] [background:var(--bkm-tooltip-row-color)]',
              'ts-chart-tooltip__swatch',
            ]
              .filter(Boolean)
              .join(' '),
          ),
          h.Style({ '--bkm-tooltip-row-color': row.color }),
        ]),
        h.span([], [row.label]),
        h.span(
          [h.Class('[text-align:right] [font-variant-numeric:tabular-nums] whitespace-nowrap')],
          [row.value],
        ),
      ],
    ),
  )

  return [titleHtml, h.div([h.Class('ts-chart-tooltip__rows'), h.AriaHidden(true)], rowHtml)]
}

export const sankeyTooltip: (props: SankeyChartProps, state: State) => NativeContent =
  function sankeyTooltip(props: SankeyChartProps, state: State) {
    const { data, tooltip } = sankeyPlan(props)
    const index = state.tooltipIndex
    const format = tooltip?.formatValue ?? formatSankeyInt

    if (index === null) {
      return h.empty
    }

    if (state.tooltipKind === 'link') {
      const link = data.links.at(index)

      if (link === undefined) {
        return h.empty
      }

      if (tooltip?.linkContent !== undefined) {
        const graph = tooltipGraph(props, state)
        const laidOut = graph.links.at(index)

        if (laidOut !== undefined) {
          return tooltip.linkContent({ link: laidOut, index })
        }
      }

      return nativeContent({
        title: `${data.nodes.at(link.source)?.name ?? `Node ${link.source}`} → ${data.nodes.at(link.target)?.name ?? `Node ${link.target}`}`,
        rows: [
          { color: 'var(--chart-foreground-muted)', label: 'Flow', value: format(link.value) },
        ],
      })
    }

    const node = data.nodes.at(index)

    if (node === undefined) {
      return h.empty
    }

    const value = Math.max(
      data.links.reduce((sum, link) => sum + (link.source === index ? link.value : 0), 0),
      data.links.reduce((sum, link) => sum + (link.target === index ? link.value : 0), 0),
    )

    if (tooltip?.nodeContent !== undefined) {
      const graph = tooltipGraph(props, state)
      const laidOut = graph.nodes.at(index)

      if (laidOut !== undefined) {
        return tooltip.nodeContent({ node: laidOut, index })
      }
    }

    return nativeContent({
      title: node.name,
      rows: [{ color: 'var(--chart-line-primary)', label: 'Sessions', value: format(value) }],
    })
  }

export const sankeyServer: (props: SankeyChartProps, state: State) => Html = function sankeyServer(
  props: SankeyChartProps,
  state: State,
) {
  const width = state.width || 630
  const height = state.height || width / ratio(props.aspectRatio ?? '2 / 1')
  const runtime = createChartRuntime<SankeyDatum, number, number>()
  const feed = createPaintFeed()
  const plan = sankeyPlan(props)

  let svg = ''

  try {
    svg = renderChartSvg(
      runtime.render(
        sankeyDefinition(
          props,
          state.id,
          () => {},
          () => 0,
          plan,
          feed,
        ),
        { width, height },
      ),
      { idPrefix: state.id, ariaLabel: props.ariaLabel ?? 'Sankey chart' },
    )
  } finally {
    runtime.destroy()
  }

  const patterns = [
    ...feed.gradients,
    ...plan.paintChildren.flatMap((child, occurrence) =>
      child.role === 'link'
        ? scopePatterns(child.props.patterns ?? [], `${state.id}-role-${occurrence}-`)
        : [],
    ),
  ]

  return h.div(
    [
      h.DataAttribute('bkm-chart', 'sankey'),
      h.Class(
        [
          'relative w-full [aspect-ratio:var(--bkm-sankey-aspect-ratio)]',
          [props.className ?? ''].filter(Boolean).join(' '),
        ]
          .filter(Boolean)
          .join(' '),
      ),
      h.Style({ '--bkm-sankey-aspect-ratio': props.aspectRatio ?? '2 / 1' }),
    ],
    [
      h.div([h.InnerHTML(svg)]),
      ...(patterns.length === 0
        ? []
        : [
            h.svg(
              [h.Class('[width:0] [height:0] absolute'), h.AriaHidden(true)],
              [h.defs([], patterns.map(resourceHtml))],
            ),
          ]),
    ],
  )
}

export const SankeyChart: (argument0: { readonly name: string }) => SankeyChartRecipe =
  function SankeyChart({ name }: { readonly name: string }) {
    const { namespace, contract, plans } = sankeyRecipe(name)

    return {
      namespace,
      contract,
      plans,
      context: sankeyContext,
      inputs: <Action>(
        id: string,
        props: SankeyChartProps,
        actions: SankeyActions<Action>,
        render?: (context: SankeyContextValue<Action>) => Html,
      ) => {
        let root: HTMLDivElement | null = null

        return {
          mount: (element, state, observe, clock) => {
            const host = new SankeyHost(element, state, props, observe, clock)
            const { root: hostRoot } = host
            root = hostRoot

            return host
          },
          configure: (host) => {
            if (!(host instanceof SankeyHost)) {
              throw new TypeError('Sankey native host required')
            }

            host.configure(props)
          },
          server: (state) => sankeyServer(props, state),
          content: (state) => [
            h.div(
              [h.Id(`${id}-tooltip`), h.Class('ts-chart-tooltip')],
              [
                h.div(
                  [
                    h.Class(
                      'ts-chart-tooltip__body min-w-[140px] overflow-hidden rounded-lg text-chart-tooltip-foreground shadow-lg bg-chart-tooltip-background backdrop-blur-md',
                    ),
                    h.DataAttribute(
                      'bkm-tooltip-body-key',
                      state.tooltipIndex === null
                        ? 'none'
                        : `${state.tooltipKind}:${state.tooltipIndex}`,
                    ),
                    h.DataAttribute(
                      'bkm-sankey-custom-content',
                      String(
                        state.tooltipKind === 'node'
                          ? sankeyPlan(props).tooltip?.nodeContent !== undefined
                          : state.tooltipKind === 'link' &&
                              sankeyPlan(props).tooltip?.linkContent !== undefined,
                      ),
                    ),
                  ],
                  contentChildren(sankeyTooltip(props, state)),
                ),
              ],
            ),
            render?.(sankeyContext(props, state, actions, root)) ?? h.empty,
          ],
        } satisfies Inputs
      },
    }
  }

function tooltipGraph(props: SankeyChartProps, state: State) {
  const width = state.width || 630
  const height = state.height || width / ratio(props.aspectRatio ?? '2 / 1')

  return sankeyContext(
    props,
    { ...state, width, height },
    {
      focusNode: () => {},
      focusLink: () => {},
    },
    null,
  ).graph
}

export interface SankeyChartRecipe extends ReturnType<typeof sankeyRecipe> {
  readonly context: typeof sankeyContext
  readonly inputs: <Action>(
    id: string,
    props: SankeyChartProps,
    actions: SankeyActions<Action>,
    render?: (context: SankeyContextValue<Action>) => Html,
  ) => Inputs
}
