import { inertHtml as h } from 'foldkit/html'
import type { Html } from 'foldkit/html'
import type { Margin } from '../cartesian/context-types'
import { renderPatternPreset } from '../kit/pattern/presets'
import { patternResourceView, scopedPatternId } from '../kit/pattern/resources'
import type { ChartBrushSelectionOverlayProps, ChartBrushTrackOverlayProps } from './options'

export const ChartBrushTrackOverlay: (
  props: Readonly<ChartBrushTrackOverlayProps>,
  context: OverlayContext,
) => Html = function ChartBrushTrackOverlay(
  props: Readonly<ChartBrushTrackOverlayProps>,
  context: OverlayContext,
) {
  if (!context.mounted) {
    return h.empty
  }

  const { x0, x1, rightWidth } = overlayBounds(props)

  if (x0 <= 0 && rightWidth <= 0) {
    return h.empty
  }

  const blur = Math.min(5, Math.max(0, props.blurPx ?? 1.5))

  const pane = (edge: 'left' | 'right', left: number, width: number) => {
    const mask =
      props.fadeOuterEdges === false
        ? ''
        : `linear-gradient(to ${edge === 'left' ? 'right' : 'left'}, transparent 0%, black 15%, black 100%)`

    const filter = blur > 0 ? `blur(${blur}px)` : ''

    return h.div([
      h.Class(
        [
          'absolute pointer-events-none',
          'bkm-brush-track-overlay-pane [backdrop-filter:var(--bkm-brush-pane-filter,_none)] [-webkit-backdrop-filter:var(--bkm-brush-pane-filter,_none)] [mask-image:var(--bkm-brush-pane-mask,_none)] [-webkit-mask-image:var(--bkm-brush-pane-mask,_none)] [top:var(--bkm-brush-pane-top)] [left:var(--bkm-brush-pane-left)] [width:var(--bkm-brush-pane-width)] [height:var(--bkm-brush-pane-height)]',
        ]
          .filter(Boolean)
          .join(' '),
      ),
      h.Style({
        '--bkm-brush-pane-filter': filter || 'none',
        '--bkm-brush-pane-mask': mask || 'none',
        '--bkm-brush-pane-top': `${context.margin.top}px`,
        '--bkm-brush-pane-left': `${left}px`,
        '--bkm-brush-pane-width': `${width}px`,
        '--bkm-brush-pane-height': `${props.innerHeight}px`,
      }),
    ])
  }

  return h.div(
    [h.Attribute('aria-hidden', 'true'), h.Class(overlayClasses)],
    [
      x0 > 0 ? pane('left', context.margin.left, x0) : h.empty,
      rightWidth > 0 ? pane('right', context.margin.left + x1, rightWidth) : h.empty,
    ],
  )
}

export const ChartBrushSelectionOverlay: (
  id: string,
  props: Readonly<ChartBrushSelectionOverlayProps>,
  context: OverlayContext,
) => Html = function ChartBrushSelectionOverlay(
  id: string,
  props: Readonly<ChartBrushSelectionOverlayProps>,
  context: OverlayContext,
) {
  const { pattern } = props

  if (!context.mounted || pattern === undefined || pattern.preset === 'none') {
    return h.empty
  }

  const { x0, x1 } = overlayBounds(props)
  const layer = renderPatternPreset(pattern.preset, 'selection', pattern)

  if (x1 - x0 <= 0 || layer === undefined) {
    return h.empty
  }

  return h.div(
    [h.Attribute('aria-hidden', 'true'), h.Class(overlayClasses)],
    [
      patternResourceView(id, [layer.props]),
      h.svg(
        [h.Width('100%'), h.Height('100%'), h.Class(overlayClasses)],
        [
          h.rect([
            h.Fill(`url(#${scopedPatternId(id, layer.props.id)})`),
            h.FillOpacity(String(pattern.opacity ?? 1)),
            h.Height(String(props.innerHeight)),
            h.Width(String(x1 - x0)),
            h.X(String(context.margin.left + x0)),
            h.Y(String(context.margin.top)),
          ]),
        ],
      ),
    ],
  )
}

/** Visible pills stay above the blur; the brush's full-height SVG handles own hit testing. */
export const ChartBrushHandleOverlay: (
  props: Readonly<Omit<ChartBrushSelectionOverlayProps, 'pattern'>>,
  context: OverlayContext,
) => Html = function ChartBrushHandleOverlay(
  props: Readonly<Omit<ChartBrushSelectionOverlayProps, 'pattern'>>,
  context: OverlayContext,
) {
  if (!context.mounted) {
    return h.empty
  }

  const { x0, x1 } = overlayBounds(props)
  const edges = x0 === x1 ? [x0] : [x0, x1]

  return h.div(
    [h.Class(`${overlayClasses} z-[2]`), h.Attribute('aria-hidden', 'true')],
    edges.map((edge) =>
      h.div([
        h.Class(
          'absolute [width:4px] [height:24px] [border-radius:0.5rem] [background-color:var(--chart-brush-border)] [top:var(--bkm-brush-pill-top)] [left:var(--bkm-brush-pill-left)]',
        ),
        h.DataAttribute('chart-brush-handle-pill', ''),
        h.Style({
          '--bkm-brush-pill-top': `${context.margin.top + (props.innerHeight - 24) / 2}px`,
          '--bkm-brush-pill-left': `${context.margin.left + edge - 2}px`,
        }),
      ]),
    ),
  )
}

export interface OverlayContext {
  readonly mounted: boolean
  readonly margin: Margin
}

const overlayClasses = 'absolute inset-0 z-[1] pointer-events-none'

export function overlayBounds(
  props: Pick<ChartBrushTrackOverlayProps, 'innerWidth' | 'selectionX0' | 'selectionX1'>,
) {
  const x0 = Math.max(0, Math.min(props.selectionX0, props.selectionX1, props.innerWidth))

  const x1 = Math.max(
    x0,
    Math.min(Math.max(props.selectionX0, props.selectionX1), props.innerWidth),
  )

  return { x0, x1, rightWidth: Math.max(0, props.innerWidth - x1) }
}
