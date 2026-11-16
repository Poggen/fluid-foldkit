export function pillFontMeasurement(element: HTMLElement, limit = 256) {
  const document = element.ownerDocument
  const context = document.createElement('canvas').getContext('2d')

  const font = () =>
    `500 14px ${document.defaultView?.getComputedStyle(document.body).fontFamily ?? ''}`

  let dependencies = new Map<string, { readonly font: string; readonly width: number }>()
  let unknown = true
  let overflow = false

  return {
    begin: () => {
      dependencies = new Map()
      unknown = true
      overflow = false
    },
    commit: () => {
      unknown = context === null || overflow
    },
    measure: (text: string): number | null => {
      if (context === null) {
        return null
      }

      context.font = font()
      const { width } = context.measureText(text)

      if (dependencies.size < limit || dependencies.has(text)) {
        dependencies.set(text, { font: context.font, width })
      } else {
        overflow = true
      }

      return width
    },
    changed: () => {
      if (context === null || unknown) {
        return true
      }

      context.font = font()

      for (const [text, previous] of dependencies) {
        if (context.font !== previous.font || context.measureText(text).width !== previous.width) {
          return true
        }
      }

      return false
    },
  }
}
