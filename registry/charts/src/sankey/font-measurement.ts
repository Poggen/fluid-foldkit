import type { SankeyTextWidth } from './label-geometry'

interface WidthDependency {
  readonly text: string
  readonly size: number
  readonly weight: number
  readonly family: string
  readonly font: string
  readonly width: number
}

export function sankeyFontMeasurement(element: HTMLElement, limit = 2048) {
  const document = element.ownerDocument
  const context = document.createElement('canvas').getContext('2d')
  let dependencies = new Map<string, WidthDependency>()
  let unknown = true
  let overflow = false

  const measure: SankeyTextWidth = (text, size, weight, family, fallbackRatio) => {
    if (context === null) {
      unknown = true

      return text.length * size * fallbackRatio
    }

    context.font = `${weight} ${size}px ${family}`
    const { width } = context.measureText(text)
    const key = JSON.stringify([text, size, weight, family, fallbackRatio])

    if (!Number.isFinite(width)) {
      overflow = true
      unknown = true
    }

    if (dependencies.size < limit || dependencies.has(key)) {
      dependencies.set(key, { text, size, weight, family, font: context.font, width })
    } else {
      overflow = true
      unknown = true
    }

    return width
  }

  return {
    measure,
    beginFontMetrics: () => {
      dependencies = new Map()
      unknown = true
      overflow = false
    },
    commitFontMetrics: () => {
      unknown = context === null || overflow
    },
    fontMetricsChanged: () => {
      if (context === null || unknown) {
        return true
      }

      const family = document.defaultView?.getComputedStyle(document.body).fontFamily ?? ''

      for (const previous of dependencies.values()) {
        context.font = `${previous.weight} ${previous.size}px ${family}`

        if (
          family !== previous.family ||
          context.font !== previous.font ||
          context.measureText(previous.text).width !== previous.width
        ) {
          return true
        }
      }

      return false
    },
  }
}
