import type { Html, HtmlBuilder } from 'foldkit/html'
import type { BarLoadingSkeletonProps, LineLoadingSweepProps } from './sweep-options'
import { barSkeletonRects, lineSweepPaths } from './sweep-geometry'
import { sweepMask } from './sweep-mask'

/** Internal paint only. The owner supplies its accepted tick/preference and genuine observation Message. */
export const lineSweepView: <Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  id: string,
  tick: number,
  reducedMotion: boolean,
  onSweepObserved: Message,
  argument5: LineSweepPaintProps<Message>,
) => ReadonlyArray<Html> = function lineSweepView<Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  id: string,
  tick: number,
  reducedMotion: boolean,
  onSweepObserved: Message,
  {
    curve,
    withArea = false,
    mode = 'loop',
    onTransitionComplete,
    stroke = 'var(--chart-foreground)',
    strokeOpacity = 0.55,
    strokeWidth = 2,
    pointCount = 14,
    durationSeconds = 2,
    innerWidth = 0,
    innerHeight = 0,
  }: LineSweepPaintProps<Message>,
) {
  const paths = lineSweepPaths(curve, innerWidth, innerHeight, pointCount, tick)

  if (paths === null) {
    return [] satisfies ReadonlyArray<Html>
  }

  const area = withArea
    ? [
        h.linearGradient(
          [
            h.Id(`${id}-area`),
            h.Attribute('x1', '0'),
            h.Attribute('x2', '0'),
            h.Attribute('y1', '0'),
            h.Attribute('y2', '1'),
          ],
          [
            h.stop([h.Offset('0%'), h.StopColor(stroke), h.Attribute('stop-opacity', '0.18')]),
            h.stop([h.Offset('100%'), h.StopColor(stroke), h.Attribute('stop-opacity', '0.02')]),
          ],
        ),
      ]
    : []

  const silhouette = [
    ...(withArea ? [h.path([h.D(paths.area), h.Fill(`url(#${id}-area)`)])] : []),
    h.path([
      h.D(paths.line),
      h.Fill('none'),
      h.Stroke(stroke),
      h.StrokeLinecap('round'),
      h.Attribute('stroke-opacity', String(strokeOpacity)),
      h.StrokeWidth(String(strokeWidth)),
    ]),
  ]

  if (reducedMotion) {
    return [
      ...(area.length === 0 ? [] : [h.defs([], area)]),
      ...silhouette,
    ] satisfies ReadonlyArray<Html>
  }

  return [
    h.defs(
      [],
      [...area, ...sweepMask(h, id, innerWidth, innerHeight, durationSeconds, onSweepObserved)],
    ),
    h.g(
      [
        h.Attribute('mask', `url(#${id}-mask)`),
        ...(mode === 'loop'
          ? []
          : [
              h.Class(
                mode === 'exit'
                  ? '[animation:bkm-sweep-fade-exit_0.45s_cubic-bezier(0.85,_0,_0.15,_1)_forwards]'
                  : '[animation:bkm-sweep-fade-enter_0.45s_cubic-bezier(0.85,_0,_0.15,_1)_forwards]',
              ),
            ]),
        ...(mode !== 'loop' && onTransitionComplete !== undefined
          ? [h.OnAnimationEnd(onTransitionComplete)]
          : []),
      ],
      silhouette,
    ),
  ] satisfies ReadonlyArray<Html>
}

/** Internal paint only. No resource or presentation callback retains a second seed. */
export const barSkeletonView: <Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  id: string,
  tick: number,
  reducedMotion: boolean,
  onSweepObserved: Message,
  props: BarLoadingSkeletonProps,
) => ReadonlyArray<Html> = function barSkeletonView<Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  id: string,
  tick: number,
  reducedMotion: boolean,
  onSweepObserved: Message,
  props: BarLoadingSkeletonProps,
) {
  const rects = barSkeletonRects(props, tick)

  if (rects === null) {
    return [] satisfies ReadonlyArray<Html>
  }

  const bars = rects.map(({ key, width, height, x, y }) =>
    h.keyed('rect')(key, [
      h.Fill(props.fill ?? 'var(--bkm-foreground)'),
      h.Attribute('fill-opacity', String(props.fillOpacity ?? 0.45)),
      h.Height(String(height)),
      h.Width(String(width)),
      h.X(String(x)),
      h.Y(String(y)),
      h.Attribute('rx', '2'),
    ]),
  )

  if (reducedMotion) {
    return [h.g([], bars)] satisfies ReadonlyArray<Html>
  }

  return [
    h.defs(
      [],
      sweepMask(
        h,
        id,
        props.innerWidth,
        props.innerHeight,
        props.durationSeconds ?? 2,
        onSweepObserved,
        props.backgroundOpacity ?? 0,
      ),
    ),
    h.g([h.Attribute('mask', `url(#${id}-mask)`)], bars),
  ] satisfies ReadonlyArray<Html>
}

interface LineSweepPaintProps<Message> extends LineLoadingSweepProps {
  readonly onTransitionComplete?: Message | undefined
}
