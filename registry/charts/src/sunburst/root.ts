import { Predicate } from 'effect'
import { cn } from '../kit/classes'
import { inertHtml as h } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import { contentChildren } from './content'
import { createChartRuntime } from '@tanstack/charts/runtime'
import { resolveChartRenderer } from '@tanstack/charts/renderer'
import { motion } from '@tanstack/charts/motion'
import { sunburstRecipe } from './block'
import type { Inputs, State } from './block'
import { SunburstHost, SUNBURST_DESCRIPTION } from './host'
import type { SunburstChartProps } from './props'
import { sunburstContext } from './context'
import type { SunburstActions } from './context'
import { sunburstPlan, sunburstResources, buildDefinition } from './build'
import { hintTextFor } from './hint'
import type { SunburstDatum } from './hub'

const breadcrumbContent: (
  props: SunburstChartProps,
  state: State,
  actions: SunburstActions,
) => Html = function breadcrumbContent(
  props: SunburstChartProps,
  state: State,
  actions: SunburstActions,
) {
  const { stable } = sunburstContext(props, state, actions)

  return h.div(
    [
      h.Class('[max-width:100%] [width:var(--bkm-sunburst-size)]'),
      h.Style({ '--bkm-sunburst-size': `${props.size ?? 520}px` }),
    ],
    props.children.flatMap((child) =>
      child.role === 'breadcrumb'
        ? [
            h.nav(
              [h.AriaLabel('Drill-down path'), h.Class(child.props.className ?? 'bk-sb-crumbs')],
              contentChildren(
                Predicate.isFunction(child.props.children)
                  ? child.props.children(stable)
                  : child.props.children,
              ),
            ),
          ]
        : [],
    ),
  )
}

const hintContent: (props: SunburstChartProps, state: State, actions: SunburstActions) => Html =
  function hintContent(props: SunburstChartProps, state: State, actions: SunburstActions) {
    const { stable, hover } = sunburstContext(props, state, actions)

    const context = {
      hintText: hintTextFor(hover.hoveredArc, stable.focus),
      hoveredArc: hover.hoveredArc,
      focus: stable.focus,
    }

    return h.div(
      [
        h.Class('[max-width:100%] [width:var(--bkm-sunburst-size)]'),
        h.Style({ '--bkm-sunburst-size': `${props.size ?? 520}px` }),
      ],
      props.children.flatMap((child) =>
        child.role === 'hint'
          ? [
              h.div(
                [
                  h.AriaLive('polite'),
                  h.Class(
                    ['[min-height:20px]', child.props.className ?? 'bk-sb-hint']
                      .filter(Boolean)
                      .join(' '),
                  ),
                ],
                contentChildren(
                  Predicate.isFunction(child.props.children)
                    ? child.props.children(context)
                    : (child.props.children ?? context.hintText),
                ),
              ),
            ]
          : [],
      ),
    )
  }

export const sunburstServer: (props: SunburstChartProps, state: State) => Html =
  function sunburstServer(props: SunburstChartProps, state: State) {
    const p = sunburstPlan(props, state)
    const r = sunburstResources(p.size, () => 0)
    const runtime = createChartRuntime<SunburstDatum, number, number>()

    let svg = ''

    if (p.model.maxDepth > 0) {
      try {
        const definition = buildDefinition({
          now: () => 0,
          controller: r.controller,
          enterStaggerScale: props.enterStaggerScale ?? 1,
          fillOf: p.fillOf,
          segmentRoles: p.segmentRoles,
          focus: p.focus,
          feed: r.feed,
          sectorRenderer: r.sectorRenderer,
          isIntro: () => true,
          center: () => null,
          controlled: props.hoveredIndex !== undefined,
          introAt: () => null,
          hasCenter: p.hasCenter,
          labels: p.labels,
          hoverPop: p.hoverPop,
          model: p.model,
          padding: p.padding,
          pushes: r.pushes,
          registry: r.registry,
          scene: () => null,
          noteSource: () => {},
          moving: () => false,
          hoveredId: () => null,
          trail: r.trail,
          sweepMs: p.sweepMs,
          enterTransition: props.enterTransition,
        })

        const scene = runtime.render(definition, {
          width: state.width || p.size,
          height: state.width || p.size,
        })

        svg = resolveChartRenderer(scene, motion({ initial: 'always' })).prerender(scene, {
          idPrefix: state.id,
          ariaDescription: SUNBURST_DESCRIPTION,
          ariaLabel: `Sunburst chart of ${props.data.name}`,
        })
      } finally {
        runtime.destroy()
      }
    }

    return h.div(
      [
        h.Class(cn('[max-width:100%] [width:var(--bkm-sunburst-size)]', props.className ?? '')),
        h.Style({ '--bkm-sunburst-size': `${p.size}px` }),
      ],
      [
        h.div([
          h.Class(
            ['[aspect-ratio:1_/_1] [max-width:var(--bkm-sunburst-stage-max-width)]', 'bk-sb-stage']
              .filter(Boolean)
              .join(' '),
          ),
          h.Style({ '--bkm-sunburst-stage-max-width': `${p.size}px` }),
          h.InnerHTML(svg),
        ]),
      ],
    )
  }

export const SunburstChart: (argument0: { readonly name: string }) => SunburstChartRecipe =
  function SunburstChart({ name }: { readonly name: string }) {
    const { namespace, contract, plans } = sunburstRecipe(name)

    return {
      namespace,
      contract,
      plans,
      context: sunburstContext,
      inputs: (_id: string, props: SunburstChartProps, actions: SunburstActions) =>
        ({
          mount: (element, state, observe, clock) =>
            new SunburstHost(element, state, props, observe, clock),
          configure: (host) => {
            if (!(host instanceof SunburstHost)) {
              throw new TypeError('Sunburst native host required')
            }

            host.configure(props)
          },
          server: (state) => sunburstServer(props, state),
          before: (state) => breadcrumbContent(props, state, actions),
          content: (state) => hintContent(props, state, actions),
        }) satisfies Inputs,
    }
  }

export interface SunburstChartRecipe extends ReturnType<typeof sunburstRecipe> {
  readonly context: typeof sunburstContext
  readonly inputs: (id: string, props: SunburstChartProps, actions: SunburstActions) => Inputs
}
