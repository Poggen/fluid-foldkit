export function acquireTooltipAttachment(surface: HTMLElement, element: HTMLElement) {
  const origin = element.ownerDocument.createComment('Chart tooltip origin')
  element.before(origin)
  let released = false
  const attach = () => {
    if (!released && element.parentElement !== surface) {
      surface.append(element)
    }
  }
  attach()

  return {
    attach,
    park: () => {
      if (!released) origin.after(element)
    },
    release: () => {
      if (released) return
      released = true
      origin.replaceWith(element)
    },
  }
}
