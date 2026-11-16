import type { Html } from 'foldkit/html'

/** Snapshot retained projection leases before an ancestor's layout attributes change. */
export function createMotionRoot(capture: () => void, flush: () => void) {
  const roots = new WeakMap<Element, { dependency: unknown }>()

  return (vnode: Html, dependency: unknown): Html => {
    if (vnode === null) return null

    const previous = vnode.data?.hook
    let captured = false

    return {
      ...vnode,
      data: {
        ...vnode.data,
        hook: {
          ...previous,
          insert(node) {
            previous?.insert?.(node)
            if (node.elm instanceof Element) roots.set(node.elm, { dependency })
          },
          prepatch(oldNode, node) {
            if (oldNode.elm instanceof Element) {
              const current = roots.get(oldNode.elm)
              if (current !== undefined && !Object.is(current.dependency, dependency)) {
                capture()
                captured = true
              }
              roots.set(oldNode.elm, { dependency })
            }
            previous?.prepatch?.(oldNode, node)
          },
          postpatch(oldNode, node) {
            previous?.postpatch?.(oldNode, node)
            if (captured) {
              captured = false
              flush()
            }
          },
          destroy(node) {
            if (node.elm instanceof Element) roots.delete(node.elm)
            previous?.destroy?.(node)
          },
        },
      },
    }
  }
}
