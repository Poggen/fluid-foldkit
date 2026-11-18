import type { Html, HtmlBuilder } from 'foldkit/html'

const BAND_STOPS = Array.from({ length: 17 }, (_, index) => {
  const t = index / 16

  return {
    offset: `${(t * 100).toFixed(0)}%`,
    opacity: Number((0.05 + Math.sin(t * Math.PI) ** 2 * 0.85).toFixed(3)),
  }
})

/** Physical iteration is an observation. Only the owning Block may decide whether to advance its seed. */
export function sweepMask<Message, Mounts>(
  h: HtmlBuilder<Message, Mounts>,
  chartId: string,
  width: number,
  height: number,
  durationSeconds: number,
  onSweepObserved: Message,
  backgroundOpacity = 0,
): ReadonlyArray<Html> {
  return [
    h.linearGradient(
      [
        h.Id(`${chartId}-grad`),
        h.Attribute('x1', '0'),
        h.Attribute('x2', '1'),
        h.Attribute('y1', '0'),
        h.Attribute('y2', '0'),
      ],
      BAND_STOPS.map(({ offset, opacity }) =>
        h.keyed('stop')(offset, [
          h.Offset(offset),
          h.StopColor('white'),
          h.Attribute('stop-opacity', String(opacity)),
        ]),
      ),
    ),
    h.mask(
      [h.Id(`${chartId}-mask`), h.Attribute('maskUnits', 'userSpaceOnUse')],
      [
        ...(backgroundOpacity <= 0
          ? []
          : [
              h.rect([
                h.Width(String(width)),
                h.Height(String(height)),
                h.Fill('white'),
                h.Attribute('fill-opacity', String(backgroundOpacity)),
              ]),
            ]),
        h.g(
          [h.Attribute('transform', `rotate(25 ${width / 2} ${height / 2})`)],
          [
            h.rect([
              h.Fill(`url(#${chartId}-grad)`),
              h.Height(String(height * 3)),
              h.Width(String(width)),
              h.X('0'),
              h.Y(String(-height)),
              h.Class('[animation:bkm-sweep-travel_var(--bkm-sweep-duration)_linear_infinite]'),
              h.Attribute(
                'style',
                `--bkm-sweep-w:${width}px;--bkm-sweep-duration:${durationSeconds}s`,
              ),
              h.OnAnimationIteration(onSweepObserved),
            ]),
          ],
        ),
      ],
    ),
  ]
}
