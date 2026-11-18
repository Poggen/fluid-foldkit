import type {
  ChartTextMeasureOptions,
  ChartTextMetrics,
  ChartTextTypography,
} from '@tanstack/charts'

const stretch: (value: string) => CanvasFontStretch = function stretch(value: string) {
  switch (value) {
    case 'ultra-condensed':
    case 'extra-condensed':
    case 'condensed':
    case 'semi-condensed':
    case 'normal':
    case 'semi-expanded':
    case 'expanded':
    case 'extra-expanded':
    case 'ultra-expanded': {
      return value
    }

    default: {
      const percent = value === '' ? Number.NaN : Number(value.replace('%', ''))

      if (!Number.isFinite(percent)) {
        return 'normal'
      }

      if (percent <= 50) {
        return 'ultra-condensed'
      }

      if (percent <= 62.5) {
        return 'extra-condensed'
      }

      if (percent <= 75) {
        return 'condensed'
      }

      if (percent <= 87.5) {
        return 'semi-condensed'
      }

      if (percent < 112.5) {
        return 'normal'
      }

      if (percent < 125) {
        return 'semi-expanded'
      }

      if (percent < 150) {
        return 'expanded'
      }

      if (percent < 200) {
        return 'extra-expanded'
      }

      return 'ultra-expanded'
    }
  }
}

const textDirection: (value: string | undefined) => 'ltr' | 'rtl' | 'inherit' =
  function textDirection(value: string | undefined) {
    if (value === 'rtl' || value === 'ltr') {
      return value
    }

    return 'inherit'
  }

const measureBounds: (
  context: CanvasRenderingContext2D,
  text: string,
  options: ChartTextMeasureOptions,
  weight: string,
) => ChartTextMetrics = function measureBounds(
  context: CanvasRenderingContext2D,
  text: string,
  options: ChartTextMeasureOptions,
  weight: string,
) {
  const scale = Number.isFinite(options.fontScale) && options.fontScale > 0 ? options.fontScale : 1
  const size = options.fontSize * scale
  context.font = `${options.fontStyle} ${options.fontWeight ?? weight} ${size}px ${options.fontFamily}`
  context.fontStretch = stretch(options.fontStretch)
  context.textAlign = options.anchor === 'middle' ? 'center' : options.anchor
  context.textBaseline = options.baseline === 'auto' ? 'alphabetic' : options.baseline
  context.direction = options.direction
  context.letterSpacing = `${options.letterSpacing * scale}px`
  const measured = context.measureText(text)
  const left = measured.actualBoundingBoxLeft
  const right = measured.actualBoundingBoxRight
  const ascent = measured.actualBoundingBoxAscent
  const descent = measured.actualBoundingBoxDescent

  if (
    [left, right, ascent, descent].every(Number.isFinite) &&
    (left + right > 0 || measured.width === 0) &&
    (ascent + descent > 0 || measured.width === 0)
  ) {
    return { x: -left, y: -ascent, width: left + right, height: ascent + descent }
  }

  const width = Number.isFinite(measured.width) ? Math.max(0, measured.width) : 0
  const end = options.direction === 'rtl' ? 'start' : 'end'
  const x = options.anchor === end ? -width : 0
  const y = options.baseline === 'hanging' ? 0 : -size * 0.8

  return {
    x: options.anchor === 'middle' ? -width / 2 : x,
    y: options.baseline === 'middle' ? -size / 2 : y,
    width,
    height: size,
  }
}

const measurementLimit = 2048

function typographyOf(element: HTMLElement) {
  const css = element.ownerDocument.defaultView?.getComputedStyle(element)
  const spacing = Number((css?.letterSpacing ?? '').replace('px', ''))

  const typography: ChartTextTypography = {
    fontFamily:
      css?.fontFamily === undefined || css.fontFamily === '' ? 'sans-serif' : css.fontFamily,
    fontStyle: css?.fontStyle === undefined || css.fontStyle === '' ? 'normal' : css.fontStyle,
    fontStretch: stretch(css?.fontStretch ?? ''),
    letterSpacing: Number.isFinite(spacing) ? spacing : 0,
    direction: textDirection(css?.direction),
  }

  return {
    typography,
    weight: css?.fontWeight === undefined || css.fontWeight === '' ? '400' : css.fontWeight,
  }
}

interface Dependency {
  readonly text: string
  readonly options: ChartTextMeasureOptions
  readonly metrics: ChartTextMetrics
}

export function cartesianFontMeasurement(element: HTMLElement, limit = measurementLimit) {
  const context = element.ownerDocument.createElement('canvas').getContext('2d')

  if (context === null) {
    return null
  }

  let style = typographyOf(element)
  const memo = new Map<string, ChartTextMetrics>()
  let dependencies = new Map<string, Dependency>()
  let collecting = new Map<string, Dependency>()
  let unknown = true
  let overflow = false

  const refresh = () => {
    const next = typographyOf(element)

    if (JSON.stringify(next) === JSON.stringify(style)) {
      return false
    }

    style = next
    memo.clear()

    return true
  }

  return {
    refresh,
    typography: () => style.typography,
    invalidate: () => {
      memo.clear()
    },
    begin: () => {
      collecting = new Map()
      unknown = true
      overflow = false
    },
    commit: () => {
      dependencies = collecting
      unknown = overflow
    },
    measure: (text: string, options: ChartTextMeasureOptions) => {
      const key = JSON.stringify([text, options, style.weight])
      const metrics = memo.get(key) ?? measureBounds(context, text, options, style.weight)

      if (memo.size < limit) {
        memo.set(key, metrics)
      }

      if (collecting.size < limit || collecting.has(key)) {
        collecting.set(key, { text, options: { ...options }, metrics })
      } else {
        overflow = true
        unknown = true
      }

      return metrics
    },
    changed: () => {
      if (refresh() || unknown) {
        return true
      }

      for (const { text, options, metrics } of dependencies.values()) {
        const next = measureBounds(context, text, options, style.weight)

        if (
          next.x !== metrics.x ||
          next.y !== metrics.y ||
          next.width !== metrics.width ||
          next.height !== metrics.height
        ) {
          return true
        }
      }

      return false
    },
  }
}
