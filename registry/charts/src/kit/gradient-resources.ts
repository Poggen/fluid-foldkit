import type { ChartGradient } from '@tanstack/charts'
import { inertHtml } from 'foldkit/html'
import type { Html } from 'foldkit/html'

export const scopedGradientId: (prefix: string, id: string) => string = function scopedGradientId(
  prefix: string,
  id: string,
) {
  const safePrefix = prefix.replaceAll(/[^a-zA-Z0-9_-]/gu, '')

  return safePrefix === '' ? id : `${safePrefix}-${id}`
}

/** Native engine resource semantics, rendered through the owning Foldkit VDOM. */
export const gradientResourceView: (
  gradients: ReadonlyArray<ChartGradient>,
  prefix: string,
) => Html = function gradientResourceView(gradients: ReadonlyArray<ChartGradient>, prefix: string) {
  const h = inertHtml

  if (gradients.length === 0) {
    return h.empty
  }

  return h.defs(
    [h.DataAttribute('ts-key', 'gradients')],
    gradients.map((gradient) => {
      const attributes = [
        h.DataAttribute('ts-key', `gradient:${gradient.id}`),
        h.Id(scopedGradientId(prefix, gradient.id)),
      ]

      let minimumOffset = 0

      const stops = gradient.stops.map((stop, index) => {
        const offset = Math.max(minimumOffset, clampUnit(stop.offset))
        minimumOffset = offset

        return h.stop([
          h.DataAttribute('ts-key', `gradient:${gradient.id}:stop:${index}`),
          h.Offset(percent(offset)),
          h.StopColor(stop.color),
          ...(stop.opacity === undefined ? [] : [h.StopOpacity(number(stop.opacity))]),
        ])
      })

      if (gradient.type === 'radial') {
        const cx = gradient.cx ?? 0.5
        const cy = gradient.cy ?? 0.5

        return h.radialGradient(
          [
            ...attributes,
            h.Cx(percent(cx)),
            h.Cy(percent(cy)),
            h.R(percent(gradient.r ?? 0.5)),
            h.Attribute('fx', percent(gradient.fx ?? cx)),
            h.Attribute('fy', percent(gradient.fy ?? cy)),
          ],
          stops,
        )
      }

      return h.linearGradient(
        [
          ...attributes,
          h.X1(percent(gradient.x1 ?? 0)),
          h.Y1(percent(gradient.y1 ?? 1)),
          h.X2(percent(gradient.x2 ?? 0)),
          h.Y2(percent(gradient.y2 ?? 0)),
        ],
        stops,
      )
    }),
  )
}

const clampUnit: (value: number) => number = (value: number) =>
  Number.isNaN(value) ? 0 : Math.max(0, Math.min(1, value))

const number: (value: number) => string = (value: number) => String(Math.round(value * 100) / 100)

const percent: (value: number) => string = (value: number) => `${number(clampUnit(value) * 100)}%`
