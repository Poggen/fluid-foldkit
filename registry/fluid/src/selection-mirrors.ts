import { Option, Schema } from 'effect'

export const MIRROR_TARGETS_ATTRIBUTE = 'selection-mirror-targets'
const decodeTargets = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Array(Schema.String)))

/** Copies one presentation after its writes. Mirrors own neither motion nor exit completion. */
export function observeSelectionMirrors(source: Element, hostIds: ReadonlyArray<string>) {
  const document = source.ownerDocument
  const copies = new Map<HTMLElement, HTMLElement>()
  let disposed = false
  const resolveHosts = () =>
    new Set(
      Option.getOrElse(
        decodeTargets(source.getAttribute(`data-${MIRROR_TARGETS_ATTRIBUTE}`)),
        () => hostIds,
      ).flatMap((id) => {
        const host = document.getElementById(id)
        return host === null || host === source || source.contains(host) ? [] : [host]
      }),
    )
  const synchronize = () => {
    if (disposed) return
    const hosts = resolveHosts()
    for (const [host, copy] of copies) {
      if (!hosts.has(host) || !host.isConnected) {
        copy.remove()
        copies.delete(host)
      }
    }
    for (const host of hosts) {
      let copy = copies.get(host)
      if (copy === undefined) {
        copy = document.createElement('div')
        copy.className = 'contents'
        copy.setAttribute('aria-hidden', 'true')
        copy.setAttribute('inert', '')
        copy.setAttribute('data-selection-mirror', '')
        copies.set(host, copy)
        host.appendChild(copy)
      }
      const shapes = Array.from(source.children).map((child) => {
        const shape = child.cloneNode(false)
        if (shape instanceof HTMLElement) {
          shape.removeAttribute('id')
          shape.setAttribute('aria-hidden', 'true')
        }
        return shape
      })
      copy.replaceChildren(...shapes)
    }
  }
  const observer = new MutationObserver(synchronize)
  observer.observe(source, { childList: true, subtree: true, attributes: true })
  const hosts = new MutationObserver(() => {
    const current = resolveHosts()
    if (
      current.size !== copies.size ||
      [...copies.keys()].some((host) => !current.has(host) || !host.isConnected)
    )
      synchronize()
  })
  hosts.observe(document.documentElement, { childList: true, subtree: true })
  synchronize()
  return () => {
    disposed = true
    observer.disconnect()
    hosts.disconnect()
    for (const copy of copies.values()) copy.remove()
    copies.clear()
  }
}
