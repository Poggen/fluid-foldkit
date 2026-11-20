/** Document-scoped delivery for the upstream MIT-licensed Ramka motion sheets. */
export interface LibrarySheet {
  release(): void
}

export function createMorphStyles(document: Document) {
  const retained = new Map<string, LibrarySheet>()
  const live = new Set<LibrarySheet>()
  let nonce: string | undefined
  const supportsConstructedSheets = () => {
    const Constructor = document.defaultView?.CSSStyleSheet
    return (
      typeof Constructor === 'function' &&
      typeof Constructor.prototype.replaceSync === 'function' &&
      document.adoptedStyleSheets != null
    )
  }
  const insertLibrarySheet = (css: string, marker: string, prepend = false) => {
    let remove: () => void
    const Constructor = document.defaultView?.CSSStyleSheet
    if (Constructor && supportsConstructedSheets()) {
      const sheet = new Constructor()
      sheet.replaceSync(css)
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
      remove = () => {
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter((value) => value !== sheet)
      }
    } else {
      const element = document.createElement('style')
      element.setAttribute(marker, '')
      if (nonce) element.nonce = nonce
      element.textContent = css
      if (prepend) document.head.prepend(element)
      else document.head.append(element)
      remove = () => element.remove()
    }
    let released = false
    const handle: LibrarySheet = {
      release() {
        if (released) return
        released = true
        remove()
        live.delete(handle)
      },
    }
    live.add(handle)
    return handle
  }
  return {
    supportsConstructedSheets,
    insertLibrarySheet,
    ensureLibrarySheet(marker: string, build: () => string, prepend = false) {
      if (!retained.has(marker)) retained.set(marker, insertLibrarySheet(build(), marker, prepend))
    },
    setNonce(value: string | undefined) {
      nonce = value
    },
    dispose() {
      for (const sheet of live) sheet.release()
      retained.clear()
    },
  }
}
export type MorphStyles = ReturnType<typeof createMorphStyles>
