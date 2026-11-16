import type { Html, VNode } from 'foldkit/html'

/** React's controlled text input keeps reset's default value synchronized with value. */
export function inputControlDefault(vnode: Html, value: string): Html {
  if (vnode === null) return null
  const previous = vnode.data?.hook

  const synchronize = (node: VNode) => {
    if (node.elm instanceof HTMLInputElement) node.elm.defaultValue = value
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
