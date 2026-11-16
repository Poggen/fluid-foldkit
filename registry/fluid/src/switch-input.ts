import type { Html, VNode } from 'foldkit/html'

/** Base's controlled hidden input keeps its mount-time native form reset default. */
export function keepSwitchInputDefault(vnode: Html, initialChecked: boolean): Html {
  if (vnode === null) return null
  const previous = vnode.data?.hook

  const synchronize = (node: VNode) => {
    if (node.elm instanceof HTMLInputElement) node.elm.defaultChecked = initialChecked
  }

  return {
    ...vnode,
    data: {
      ...vnode.data,
      hook: {
        ...previous,
        insert(node) {
          previous?.insert?.(node)
          synchronize(node)
        },
        postpatch(oldNode, node) {
          previous?.postpatch?.(oldNode, node)
          synchronize(node)
        },
      },
    },
  }
}
