import type { Html } from 'foldkit/html'

/** Base leaves native form-reset checkedness alone until its controlled prop changes. */
export function preserveCheckboxReset(vnode: Html, checked: boolean, preserve: boolean): Html {
  if (vnode === null || !preserve) return vnode
  const previous = vnode.data?.hook

  return {
    ...vnode,
    data: {
      ...vnode.data,
      hook: {
        ...previous,
        postpatch(oldNode, node) {
          const oldChecked =
            oldNode.elm instanceof HTMLInputElement ? oldNode.elm.checked : undefined

          previous?.postpatch?.(oldNode, node)

          if (
            node.elm instanceof HTMLInputElement &&
            oldNode.data?.props?.checked === checked &&
            oldChecked !== undefined
          )
            node.elm.checked = oldChecked
        },
      },
    },
  }
}
