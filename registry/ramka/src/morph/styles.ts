/** Document-scoped delivery for the upstream MIT-licensed Ramka motion sheets. */
export interface LibrarySheet {
  release(): void
}

interface RetainedSheet {
  owners: number
  remove(): void
}

const documentSheets = new WeakMap<Document, Map<string, RetainedSheet>>()

export function createMorphStyles(document: Document) {
  const retained = new Set<string>()
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
  const insertSheet = (css: string, marker: string, prepend: boolean) => {
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
    return remove
  }
  const insertLibrarySheet = (css: string, marker: string, prepend = false) => {
    const remove = insertSheet(css, marker, prepend)
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
      if (retained.has(marker)) return
      let shared = documentSheets.get(document)
      if (!shared) {
        shared = new Map()
        documentSheets.set(document, shared)
      }
      const sheet = shared.get(marker)
      if (sheet) sheet.owners += 1
      else shared.set(marker, { owners: 1, remove: insertSheet(build(), marker, prepend) })
      retained.add(marker)
    },
    setNonce(value: string | undefined) {
      nonce = value
    },
    dispose() {
      for (const sheet of live) sheet.release()
      const shared = documentSheets.get(document)
      if (shared) {
        for (const marker of retained) {
          const sheet = shared.get(marker)
          if (sheet && --sheet.owners === 0) {
            sheet.remove()
            shared.delete(marker)
          }
        }
        if (shared.size === 0) documentSheets.delete(document)
      }
      retained.clear()
    },
  }
}
export type MorphStyles = ReturnType<typeof createMorphStyles>
