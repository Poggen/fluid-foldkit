import type { SceneRect } from '@tanstack/charts'

export interface BarFrontRect extends SceneRect {
  readonly className: string
}

const encode: (value: string) => string = (value: string) =>
  Array.from(value, (unit) => unit.codePointAt(0)?.toString(16)).join('-')

export const barFrontClass: (id: string, key: string) => string = (id: string, key: string) =>
  `bkm-bar-front-${encode(id)}--${encode(key)}`

const axes = ['x', 'y', 'width', 'height'] as const

type GeometryAxis = (typeof axes)[number]

const currentProperty = (axis: GeometryAxis) => `--bkm-bar-current-${axis}`

/** Keep exact targets separate from the live values owned by Bar's existing entrance. */
export const barFrontTargetCss: (rectangles: ReadonlyArray<BarFrontRect>) => string = (
  rectangles: ReadonlyArray<BarFrontRect>,
) =>
  rectangles
    .map(
      (rect) =>
        `.${rect.className}{${axes
          .map((axis) => `--bkm-bar-target-${axis}:${rect[axis]}px`)
          .join(';')};--bkm-bar-radius:${rect.radius ?? 0}px}`,
    )
    .join('')

/** Rules live outside the reconciled SVG, which removes undeclared inline attributes. */
export function barFrontCurrentRules(element: HTMLElement) {
  const style = element.ownerDocument.createElement('style')
  style.dataset.bkmBarCurrentGeometry = ''
  element.append(style)
  const view = element.ownerDocument.defaultView

  if (view === null) {
    throw new Error('Bar current geometry requires its owning Window')
  }

  return {
    acquire(className: string) {
      const { sheet } = style

      if (sheet === null) {
        throw new Error('Bar current geometry requires its mounted stylesheet')
      }

      const index = sheet.insertRule(`.${className}{}`, sheet.cssRules.length)
      const rule = sheet.cssRules[index]

      if (!(rule instanceof view.CSSStyleRule)) {
        throw new Error('Bar current geometry requires a CSS style rule')
      }

      return {
        set(axis: GeometryAxis, value: number) {
          rule.style.setProperty(currentProperty(axis), `${value}px`)
        },
        destroy() {
          const currentIndex = [...sheet.cssRules].indexOf(rule)

          if (currentIndex !== -1) {
            sheet.deleteRule(currentIndex)
          }
        },
      }
    },
    destroy() {
      style.remove()
    },
  }
}
