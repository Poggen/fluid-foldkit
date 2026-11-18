import { createChartRuntime } from '@tanstack/charts/runtime'
import { resolveChartAdapterLayout } from '@tanstack/charts/adapter'
import type { SceneNode } from '@tanstack/charts'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { formatToData } from 'number-flow/lite'
import { gaugeLayout, gaugeLabelClasses } from './host-layout'
import type { NotchEnter } from './transition'
import { gaugeOptions } from './options'
import {
  buildEnterCss,
  gaugeEntranceKey,
  notchEntranceClass,
  notchEntranceStyle,
} from './enter-css'
import { toNotchEnter } from './transition'
import { clampStagger } from './notches'
import type { GaugeProps } from './props'
import { defaultGaugeStatFormat } from './props'
import { numberServerView } from './number-server'

const notchView: <Message, Requirements>(
  h: HtmlBuilder<Message, Requirements>,
  node: SceneNode,
  enter: NotchEnter | undefined,
  index?: number,
  active?: boolean,
) => Html = function <Message, Requirements>(
  h: HtmlBuilder<Message, Requirements>,
  node: SceneNode,
  enter: NotchEnter | undefined,
  index = 0,
  active = false,
) {
  const style = node.style

  const attributes = [
    h.DataAttribute('ts-key', node.key),
    h.Class(
      [
        node.className ?? '',
        ...(enter !== undefined && (node.kind === 'area' || node.kind === 'rect')
          ? [notchEntranceClass]
          : []),
      ].join(' '),
    ),
    ...(enter !== undefined && (node.kind === 'area' || node.kind === 'rect')
      ? [h.Attribute('style', notchEntranceStyle(enter, index, active))]
      : []),
    ...(node.ariaHidden ? [h.AriaHidden(true)] : []),
    ...(
      [
        ['fill', style?.fill],
        ['fill-opacity', style?.fillOpacity],
        ['stroke', style?.stroke],
        ['stroke-opacity', style?.strokeOpacity],
        ['stroke-width', style?.strokeWidth],
        ['opacity', style?.opacity],
        ['stroke-linecap', style?.lineCap],
        ['stroke-linejoin', style?.lineJoin],
        ['stroke-dasharray', style?.strokeDasharray],
      ] satisfies ReadonlyArray<readonly [string, string | number | undefined]>
    )
      .filter((entry) => entry[1] !== undefined)
      .map(([name, value]) =>
        h.Attribute(name, typeof value === 'number' ? number(value) : String(value)),
      ),
  ]

  switch (node.kind) {
    case 'group':
      return h.g(
        [
          ...attributes,
          ...(node.translateX === undefined && node.translateY === undefined
            ? []
            : [
                h.Transform(
                  `translate(${number(node.translateX ?? 0)} ${number(node.translateY ?? 0)})`,
                ),
              ]),
        ],
        node.children.map((child, childIndex) =>
          notchView(h, child, enter, childIndex, active || node.key === 'gauge:active'),
        ),
      ) satisfies Html
    case 'area':
    case 'polyline': {
      const points = (ring: ReadonlyArray<readonly [number, number]>, close: boolean) =>
        `${ring.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${number(x)},${number(y)}`).join('')}${close ? 'Z' : ''}`

      const polygonPath =
        node.kind === 'area' && node.polygons !== undefined
          ? node.polygons
              .flatMap((polygon) => polygon)
              .filter((ring) => ring.length > 0)
              .map((ring) => points(ring, true))
              .join('')
          : undefined

      return h.path([
        ...attributes,
        h.D(polygonPath ?? node.path ?? points(node.points, node.kind === 'area')),
        h.VectorEffect('non-scaling-stroke'),
        ...(polygonPath === undefined ? [] : [h.FillRule('evenodd')]),
      ]) satisfies Html
    }

    case 'rect':
      return h.rect([
        ...attributes,
        h.X(number(node.x)),
        h.Y(number(node.y)),
        h.Width(number(node.width)),
        h.Height(number(node.height)),
        ...(node.radius === undefined ? [] : [h.Rx(number(node.radius))]),
      ]) satisfies Html
    case 'rule':
      return h.line([
        ...attributes,
        h.X1(number(node.x1)),
        h.Y1(number(node.y1)),
        h.X2(number(node.x2)),
        h.Y2(number(node.y2)),
      ]) satisfies Html
    case 'dot':
      return h.circle([
        ...attributes,
        h.Cx(number(node.x)),
        h.Cy(number(node.y)),
        h.R(number(node.radius)),
      ]) satisfies Html
    case 'label':
      return h.text(
        [...attributes, h.X(number(node.x)), h.Y(number(node.y))],
        [node.text],
      ) satisfies Html
  }
}

const labelView: <Message, Requirements>(
  h: HtmlBuilder<Message, Requirements>,
  props: GaugeProps,
  arc: boolean,
) => Html = function labelView<Message, Requirements>(
  h: HtmlBuilder<Message, Requirements>,
  props: GaugeProps,
  arc: boolean,
) {
  if (props.centerValue === undefined) return h.empty satisfies Html
  const classes = gaugeLabelClasses(props, arc)

  const data = formatToData(
    arc ? 0 : props.centerValue,
    new Intl.NumberFormat(undefined, props.formatOptions ?? defaultGaugeStatFormat),
    props.prefix,
    props.suffix,
  )

  return h.div(
    [h.Class(classes.outer)],
    [
      h.div(
        [h.Class(classes.inner)],
        [
          h.span(
            [
              h.Class(
                arc
                  ? 'ts-bkm-center-stat-value ts-bkm-gauge-arc-value'
                  : 'ts-bkm-gauge-linear-stat-value',
              ),
            ],
            [numberServerView(h, data)],
          ),
          h.span(
            [h.Class(arc ? 'ts-bkm-center-stat-label' : 'ts-bkm-gauge-linear-stat-label')],
            [props.defaultLabel ?? 'Total'],
          ),
        ],
      ),
    ],
  ) satisfies Html
}

/** Typed server reserve. The live drawing is acquired by the registered Mount, never injected as HTML. */
export const gaugeServerView: <Message, Requirements>(
  h: HtmlBuilder<Message, Requirements>,
  props: GaugeProps,
  uid: string,
) => Html = function gaugeServerView<Message, Requirements>(
  h: HtmlBuilder<Message, Requirements>,
  props: GaugeProps,
  uid: string,
) {
  const options = gaugeOptions(props, uid, true)
  const layout = resolveChartAdapterLayout(options)
  const runtime = createChartRuntime()

  const scene = runtime.render(options.definition, {
    width: layout.initialWidth,
    height: layout.initialHeight,
  })

  runtime.destroy()
  const presentation = gaugeLayout(props)
  const { linear } = presentation

  const enter = toNotchEnter(props.enterTransition)

  const chart = h.div(
    [h.Class(presentation.wrapperClass), h.Attribute('style', presentation.wrapperStyle)],
    [
      h.div(
        [h.Class('ts-chart-surface w-full h-full')],
        [
          h.svg(
            [
              h.Class('ts-chart block overflow-visible'),
              h.Width('100%'),
              h.Height('100%'),
              h.ViewBox(`0 0 ${number(scene.width)} ${number(scene.height)}`),
              h.Role('img'),
              h.AriaRoleDescription('chart'),
              h.AriaLabel(options.ariaLabel),
              h.Tabindex(-1),
            ],
            scene.nodes.map((node) =>
              notchView(h, node, linear && props.geometryScrubbing === true ? undefined : enter),
            ),
          ),
        ],
      ),
    ],
  )

  const resources =
    props.useGradient && props.activeGradient === undefined && !props.activeFill
      ? h.svg(
          [
            h.AriaHidden(true),
            h.Attribute('focusable', 'false'),
            h.Height('0'),
            h.Width('0'),
            h.Id(`${uid}-resources`),
            h.Class('h-0 overflow-hidden absolute w-0'),
          ],
          [
            h.defs(
              [],
              [
                h.linearGradient(
                  [
                    h.Id(`${uid}-gauge-theme-active`),
                    h.X1('0%'),
                    h.X2('100%'),
                    h.Y1('0%'),
                    h.Y2('0%'),
                  ],
                  [
                    h.stop([h.Offset('0%'), h.StopColor('var(--chart-1)')]),
                    h.stop([h.Offset('100%'), h.StopColor('var(--chart-5)')]),
                  ],
                ),
              ],
            ),
          ],
        )
      : h.empty

  const track = h.div(
    [h.Class(presentation.boxClass), h.Attribute('style', presentation.boxStyle)],
    [chart, resources, ...(!linear ? [labelView(h, props, true)] : [])],
  )

  const linearTrack = h.div([h.Class(presentation.linearTrackClass)], [track])

  const label = labelView(h, props, false)

  const labelled = h.div(
    [h.Class(presentation.linearLayoutClass)],
    props.centerValue === undefined
      ? [track]
      : presentation.labelFirst
        ? [label, linearTrack]
        : [linearTrack, label],
  )

  return h.div(
    [
      h.DataAttribute('bkm-server-reserve', ''),
      h.DataAttribute('bkm-chart', ''),
      h.DataAttribute('bkm-hydrating', ''),
      ...(linear && props.geometryScrubbing === true
        ? []
        : [h.DataAttribute('bkm-gn', gaugeEntranceKey(enter))]),
      h.Class([presentation.rootClass].join(' ')),
      h.Attribute(
        'style',
        `--bkm-gn-dur:${enter.durationMs}ms;--bkm-gn-s:${clampStagger(props.enterStaggerScale ?? 1)};${presentation.rootStyle}`,
      ),
    ],
    [
      linear && props.geometryScrubbing === true ? h.empty : h.style([], [buildEnterCss(enter)]),
      linear
        ? props.width === undefined
          ? h.div(
              [
                h.Class(presentation.linearClipClass),
                h.Attribute('style', presentation.linearClipStyle),
              ],
              [
                h.div(
                  [h.Class('bk-gauge-clip-box')],
                  [h.div([h.Class('bk-gauge-clip-inner')], [labelled])],
                ),
              ],
            )
          : labelled
        : track,
    ],
  ) satisfies Html
}

const number: (value: number) => string = (value: number) => String(Math.round(value * 100) / 100)
