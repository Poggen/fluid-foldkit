import type { CrosshairPaintOptions } from './hover-overlay-model'

const fadeStops: (rule: CrosshairPaintOptions) => ReadonlyArray<readonly [number, number]> =
  function fadeStops(rule: CrosshairPaintOptions) {
    const fade = Math.min(40, Math.max(2, rule.fadeLength ?? 10))

    const stops: Readonly<
      Record<
        NonNullable<CrosshairPaintOptions['fadeEdges']>,
        ReadonlyArray<readonly [number, number]>
      >
    > = {
      none: [],
      top: [
        [0, 0],
        [fade, 1],
        [100, 1],
      ],
      bottom: [
        [0, 1],
        [100 - fade, 1],
        [100, 0],
      ],
      both: [
        [0, 0],
        [fade, 1],
        [50, 1],
        [100 - fade, 1],
        [100, 0],
      ],
    }

    return stops[rule.fadeEdges ?? 'both']
  }

export const createCrosshairPaint: (options: {
  readonly svg: SVGSVGElement
  readonly rule: CrosshairPaintOptions
  readonly height: number
  readonly gradientId: string
}) => CrosshairPaint = function createCrosshairPaint(options: {
  readonly svg: SVGSVGElement
  readonly rule: CrosshairPaintOptions
  readonly height: number
  readonly gradientId: string
}) {
  const { svg, rule, height, gradientId } = options
  const owner = svg.ownerDocument

  if (rule.dash !== undefined && rule.dash.length > 0) {
    const line = owner.createElementNS(SVG_NS, 'line')
    line.setAttribute('y2', String(height))
    line.classList.add(
      '[stroke-width:var(--bkm-rule-width)]',
      '[stroke-dasharray:var(--bkm-rule-dash)]',
      '[stroke:var(--bkm-rule-color)]',
    )
    line.style.setProperty('--bkm-rule-width', String(Math.max(1, rule.width)))
    line.style.setProperty('--bkm-rule-dash', rule.dash.replace(',', ' '))

    return {
      mark: line,
      paint: (color) => {
        line.style.setProperty('--bkm-rule-color', color)
      },
    }
  }

  const bar = owner.createElementNS(SVG_NS, 'rect')
  bar.setAttribute('x', String(-rule.width / 2))
  bar.setAttribute('width', String(rule.width))
  bar.setAttribute('height', String(height))
  bar.classList.add('[fill:var(--bkm-rule-fill)]')
  const values = fadeStops(rule)

  if (values.length === 0) {
    return {
      mark: bar,
      paint: (color) => {
        bar.style.setProperty('--bkm-rule-fill', color)
      },
    }
  }

  const defs = owner.createElementNS(SVG_NS, 'defs')
  const gradient = owner.createElementNS(SVG_NS, 'linearGradient')
  gradient.id = gradientId
  gradient.setAttribute('x1', '0%')
  gradient.setAttribute('x2', '0%')
  gradient.setAttribute('y1', '0%')
  gradient.setAttribute('y2', '100%')

  const stops = values.map(([offset, opacity]) => {
    const stop = owner.createElementNS(SVG_NS, 'stop')

    stop.setAttribute('offset', `${offset}%`)
    stop.classList.add(
      '[stop-opacity:var(--bkm-rule-stop-opacity)]',
      '[stop-color:var(--bkm-rule-stop-color)]',
    )
    stop.style.setProperty('--bkm-rule-stop-opacity', String(opacity))
    gradient.append(stop)

    return stop
  })

  defs.append(gradient)
  svg.append(defs)
  bar.style.setProperty('--bkm-rule-fill', `url(#${gradientId})`)

  return {
    mark: bar,
    paint: (color) => {
      for (const stop of stops) {
        stop.style.setProperty('--bkm-rule-stop-color', color)
      }
    },
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg'

interface CrosshairPaint {
  readonly mark: SVGElement
  readonly paint: (color: string) => void
}
