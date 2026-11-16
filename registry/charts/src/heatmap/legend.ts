import { Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import {
  resolveHeatmapLevelStyles,
  defaultHeatmapColorScale,
  isHeatmapLevelPattern,
  heatmapLevelPatternId,
} from './colors'
import { heatmapResources, resourceHtml } from './resources'
import { buildHeatmapLegendGradient } from './legend-gradient'
import type { HeatmapLegendProps } from './legend-options'
import type { HeatmapInteractionValue } from './interaction'
import { getHeatmapContributionLevel } from './contribution-level'
import { resolveHeatmapHoverStyle, isHeatmapHoverEffectEnabled } from './hover-style'
import { chartStyleText } from '../cartesian/style'

export const HEATMAP_LEGEND_LEVELS: readonly [0, 1, 2, 3, 4] = [0, 1, 2, 3, 4]

const transition = 'opacity .22s cubic-bezier(.4,0,.2,1), transform .22s cubic-bezier(.4,0,.2,1)'

export function HeatmapLegend<Message>(
  props: HeatmapLegendProps,
  h: HtmlBuilder<Message>,
  id: string,
  interaction?: HeatmapInteractionValue<Message>,
) {
  const colors = props.colorScale ?? defaultHeatmapColorScale

  const styles =
    props.levelStyles ??
    resolveHeatmapLevelStyles([colors(0), colors(1), colors(2), colors(3), colors(4)], undefined)

  const size = props.cellSize ?? 11,
    gap = props.gap ?? 2,
    radius = props.cornerRadius ?? 2

  const highlighted =
    interaction?.hoveredLegendLevel ??
    (interaction?.hoveredCell === null || interaction?.hoveredCell === undefined
      ? null
      : getHeatmapContributionLevel(interaction.hoveredCell.count))

  const interactive = props.interactive ?? interaction !== undefined

  const params = {
    inactiveOpacity: props.inactiveOpacity ?? 0.3,
    inactiveScale: props.inactiveScale ?? 1,
    activeScale: props.activeScale ?? 1,
  }

  const dimming = interactive && highlighted !== null && isHeatmapHoverEffectEnabled(params)

  const hover = (level: number) => {
    const style = resolveHeatmapHoverStyle(
      highlighted === level,
      dimming && highlighted !== level,
      params,
    )

    return { opacity: style.opacity, transform: `scale(${style.scale})`, transition }
  }

  const handlers = (level: number) =>
    interactive && interaction !== undefined
      ? [
          h.OnMouseEnter(interaction.requestLegendLevel(level)),
          h.OnPointerDown(() => Option.some(interaction.requestLegendLevel(level))),
          h.OnPointerLeave(() => Option.some(interaction.requestLegendLevel(null))),
        ]
      : []

  const label = (text: string) =>
    h.span(
      [
        h.Class(`ts-bkm-heatmap-legend-label ${props.labelClassName ?? ''}`.trim()),
        ...(props.fontSize === undefined ? [h.Style({ fontSize: '12px' })] : []),
      ],
      [text],
    )

  const swatches = h.div(
    [h.Class('ts-bkm-heatmap-legend-swatches'), h.Attribute('style', chartStyleText({ gap }))],
    HEATMAP_LEGEND_LEVELS.map((level) => {
      const style = styles[level],
        patterned = isHeatmapLevelPattern(style)

      const visual = patterned
        ? h.span(
            [
              h.AriaHidden(true),
              h.Class('ts-bkm-heatmap-legend-swatch ts-bkm-heatmap-legend-swatch--pattern'),
              h.Attribute(
                'style',
                chartStyleText({
                  borderRadius: radius,
                  height: size,
                  width: size,
                  opacity: style.patternOpacity ?? 1,
                  overflow: 'hidden',
                }),
              ),
            ],
            [
              h.svg(
                [
                  h.Class('block h-full w-full'),
                  h.AriaHidden(true),
                  h.Attribute('viewBox', `0 0 ${size} ${size}`),
                ],
                [
                  h.defs(
                    [],
                    heatmapResources(styles, id, 0, 0)
                      .filter(
                        (resource) =>
                          resource.attributes.id === `${id}-${heatmapLevelPatternId(level)}-base`,
                      )
                      .map(resourceHtml),
                  ),
                  h.rect([
                    h.Attribute('width', String(size)),
                    h.Attribute('height', String(size)),
                    h.Attribute('rx', String(radius)),
                    h.Attribute('ry', String(radius)),
                    h.Attribute('fill', `url(#${id}-${heatmapLevelPatternId(level)}-base)`),
                  ]),
                ],
              ),
            ],
          )
        : h.span([
            h.AriaHidden(true),
            h.Class('ts-bkm-heatmap-legend-swatch'),
            h.Attribute(
              'style',
              chartStyleText({
                backgroundColor: style.color,
                borderRadius: radius,
                boxSizing: 'border-box',
                height: size,
                width: size,
                ...(level === 0 ? { border: `1px solid ${style.color}` } : {}),
              }),
            ),
          ])

      return h.span(
        [
          h.Class('ts-bkm-heatmap-legend-swatch-wrap'),
          h.Attribute(
            'style',
            chartStyleText({ ...hover(level), ...(interactive ? { cursor: 'pointer' } : {}) }),
          ),
          ...handlers(level),
        ],
        [visual],
      )
    }),
  )

  const barWidth = (props.gradientSpan ?? 5) * size + ((props.gradientSpan ?? 5) - 1) * gap
  const segment = barWidth / HEATMAP_LEGEND_LEVELS.length

  const gradient = h.div(
    [
      h.Class('ts-bkm-heatmap-legend-gradient'),
      h.Attribute('style', chartStyleText({ height: size, width: barWidth })),
    ],
    [
      h.div([
        h.AriaHidden(true),
        h.Class('ts-bkm-heatmap-legend-gradient-bar'),
        h.Attribute(
          'style',
          chartStyleText({
            background: buildHeatmapLegendGradient(styles),
            borderRadius: Math.min(radius, size / 2),
            opacity: 1,
            transition: 'opacity .22s cubic-bezier(.4,0,.2,1)',
          }),
        ),
      ]),
      ...HEATMAP_LEGEND_LEVELS.map((level) =>
        h.span([
          h.Class('ts-bkm-heatmap-legend-gradient-segment'),
          h.Attribute(
            'style',
            chartStyleText({
              ...hover(level),
              height: size,
              left: level * segment,
              width: segment,
              ...(interactive ? { cursor: 'pointer' } : {}),
            }),
          ),
          ...handlers(level),
        ]),
      ),
    ],
  )

  return h.div(
    [
      h.Class(`ts-bkm-heatmap-legend ${props.className ?? ''}`.trim()),
      h.Attribute(
        'style',
        chartStyleText({
          gap: '.375rem',
          justifyContent:
            props.align === 'start'
              ? 'flex-start'
              : props.align === 'center'
                ? 'center'
                : 'flex-end',
          ...(props.fontSize === undefined ? {} : { fontSize: props.fontSize }),
        }),
      ),
    ],
    [
      label(props.lessLabel ?? 'Less'),
      props.variant === 'gradient' ? gradient : swatches,
      label(props.moreLabel ?? 'More'),
    ],
  )
}
