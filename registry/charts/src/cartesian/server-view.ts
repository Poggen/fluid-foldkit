import { absurd, Hash, Predicate } from 'effect'
import { gradientResourceView, scopedGradientId } from '../kit/gradient-resources'
import { resolveChartRenderer } from '@tanstack/charts/renderer'
import type { ChartRenderer } from '@tanstack/charts'
import { createChartRuntime } from '@tanstack/charts/runtime'
import type { SceneNode, DomChartDefinition, ChartValue } from '@tanstack/charts'
import { inertHtml } from 'foldkit/html'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ChartStyle } from './content-types'
import { chartStyleProperties } from './style'

const sceneLabelView: <Message, Requirements>(
  h: HtmlBuilder<Message, Requirements>,
  node: Extract<SceneNode, { kind: 'label' }>,
  attributes: ReturnType<typeof sceneNodeAttributes<Message, Requirements>>,
) => Html = function sceneLabelView<Message, Requirements>(
  h: HtmlBuilder<Message, Requirements>,
  node: Extract<SceneNode, { kind: 'label' }>,
  attributes: ReturnType<typeof sceneNodeAttributes<Message, Requirements>>,
) {
  return h.text(
    [
      ...attributes,
      h.X(number(node.x)),
      h.Y(number(node.y)),
      ...(node.anchor === undefined ? [] : [h.Attribute('text-anchor', node.anchor)]),
      ...(node.baseline === undefined ? [] : [h.Attribute('dominant-baseline', node.baseline)]),
      ...(node.fontSize === undefined ? [] : [h.Attribute('font-size', number(node.fontSize))]),
      ...(node.fontWeight === undefined
        ? []
        : [h.Attribute('font-weight', number(node.fontWeight))]),
      h.Attribute('font-family', 'inherit'),
      ...(node.rotate === undefined
        ? []
        : [h.Transform(`rotate(${number(node.rotate)} ${number(node.x)} ${number(node.y)})`)]),
    ],
    [node.text],
  ) satisfies Html
}

const sceneNodeView: <Message, Requirements>(
  h: HtmlBuilder<Message, Requirements>,
  node: SceneNode,
  uid: string,
  gradients: ReadonlySet<string>,
) => Html = function <Message, Requirements>(
  h: HtmlBuilder<Message, Requirements>,
  node: SceneNode,
  uid: string,
  gradients: ReadonlySet<string>,
) {
  const attributes = sceneNodeAttributes(h, node, uid, gradients)

  switch (node.kind) {
    case 'group': {
      const { clip } = node
      const clipId = `${uid}-clip-${stableId(node.key)}`

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
          ...(clip === undefined ? [] : [h.Attribute('clip-path', `url(#${clipId})`)]),
        ],
        [
          ...(clip === undefined
            ? []
            : [
                h.defs(
                  [],
                  [
                    h.clipPath(
                      [h.Id(clipId)],
                      [
                        h.rect([
                          h.X(number(clip.x)),
                          h.Y(number(clip.y)),
                          h.Width(number(clip.width)),
                          h.Height(number(clip.height)),
                        ]),
                      ],
                    ),
                  ],
                ),
              ]),
          ...node.children.map((child) => sceneNodeView(h, child, uid, gradients)),
        ],
      ) satisfies Html
    }

    case 'area':
    case 'polyline': {
      const points = (ring: ReadonlyArray<readonly [number, number]>, close: boolean) =>
        `${ring.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${number(x)},${number(y)}`).join('')}${close ? 'Z' : ''}`

      const polygonPath =
        node.kind === 'area' && node.polygons !== undefined
          ? node.polygons
              .flat()
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

    case 'rect': {
      return h.rect([
        ...attributes,
        h.X(number(node.x)),
        h.Y(number(node.y)),
        h.Width(number(node.width)),
        h.Height(number(node.height)),
        ...(node.radius === undefined ? [] : [h.Rx(number(node.radius))]),
      ]) satisfies Html
    }

    case 'rule': {
      return h.line([
        ...attributes,
        h.X1(number(node.x1)),
        h.Y1(number(node.y1)),
        h.X2(number(node.x2)),
        h.Y2(number(node.y2)),
      ]) satisfies Html
    }

    case 'dot': {
      return h.circle([
        ...attributes,
        h.Cx(number(node.x)),
        h.Cy(number(node.y)),
        h.R(number(node.radius)),
      ]) satisfies Html
    }

    case 'label': {
      return sceneLabelView(h, node, attributes) satisfies Html
    }

    default: {
      return absurd(node) satisfies Html
    }
  }
}

export const cartesianServerView: <Row, XValue extends ChartValue, YValue extends ChartValue>(
  definition: DomChartDefinition<Row, XValue, YValue>,
  width: number,
  height: number,
  uid: string,
  ariaLabel: string,
  overlay?: () => Html,
  paintStyle?: ChartStyle,
  renderer?: ChartRenderer<Row, XValue, YValue>,
) => Html = function cartesianServerView<Row, XValue extends ChartValue, YValue extends ChartValue>(
  definition: DomChartDefinition<Row, XValue, YValue>,
  width: number,
  height: number,
  uid: string,
  ariaLabel: string,
  overlay: () => Html = () => inertHtml.empty,
  paintStyle: ChartStyle = {},
  renderer?: ChartRenderer<Row, XValue, YValue>,
) {
  const h = inertHtml
  const runtime = createChartRuntime<Row, XValue, YValue>()
  const scene = runtime.render(definition, { width, height })
  runtime.destroy()
  const gradients = new Set(scene.gradients.map((item) => item.id))
  const definitions = gradientResourceView(scene.gradients, uid)

  return h.div(
    [
      h.DataAttribute('bkm-server-reserve', ''),
      h.Class(
        'relative ts-chart-host [width:var(--bkm-server-width)] [height:var(--bkm-server-height)]',
      ),
      h.Style({
        ...Object.fromEntries(
          Object.entries(chartStyleProperties(paintStyle)).filter(
            ([name]) => name.startsWith('--') || name === 'color' || name === 'color-interpolation',
          ),
        ),
        '--bkm-server-width': `${width}px`,
        '--bkm-server-height': `${height}px`,
      }),
    ],
    [
      h.div(
        [
          h.Class('ts-chart-surface w-full h-full'),
          ...(renderer === undefined
            ? []
            : [
                h.InnerHTML(
                  resolveChartRenderer(scene, renderer).prerender(scene, {
                    ariaLabel,
                    idPrefix: uid,
                  }),
                ),
              ]),
        ],
        renderer === undefined
          ? [
              h.svg(
                [
                  h.Class('ts-chart block overflow-visible'),
                  h.Width('100%'),
                  h.Height('100%'),
                  h.ViewBox(`0 0 ${number(width)} ${number(height)}`),
                  h.Role('img'),
                  h.AriaRoleDescription('chart'),
                  h.AriaLabel(ariaLabel),
                  h.Tabindex(0),
                ],
                [definitions, ...scene.nodes.map((node) => sceneNodeView(h, node, uid, gradients))],
              ),
            ]
          : [],
      ),
      overlay(),
    ],
  ) satisfies Html
}

const stableId: (value: string) => string = (value: string) => Hash.string(value).toString(36)

const scopedPaint: (paint: string, uid: string, gradients: ReadonlySet<string>) => string = (
  paint: string,
  uid: string,
  gradients: ReadonlySet<string>,
) => {
  const match = /^url\(#(?<id>[^)]+)\)$/u.exec(paint)
  const id = match?.groups?.id

  return id !== undefined && gradients.has(id) ? `url(#${scopedGradientId(uid, id)})` : paint
}

const number: (value: number) => string = (value: number) => String(Math.round(value * 100) / 100)

function sceneNodeAttributes<Message, Requirements>(
  h: HtmlBuilder<Message, Requirements>,
  node: SceneNode,
  uid: string,
  gradients: ReadonlySet<string>,
) {
  const { style } = node

  return [
    h.DataAttribute('ts-key', node.key),
    ...(node.className === undefined ? [] : [h.Class(node.className)]),
    ...(node.ariaHidden === true ? [h.AriaHidden(true)] : []),
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
    ).flatMap(([name, value]) =>
      value === undefined
        ? []
        : [
            h.Attribute(
              name,
              Predicate.isNumber(value) ? number(value) : scopedPaint(value, uid, gradients),
            ),
          ],
    ),
  ]
}
