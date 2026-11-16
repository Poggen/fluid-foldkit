import type { Html } from 'foldkit/html'

export const INPUT_MESSAGE_COMMIT_EVENT = 'fluid-input-message-commit'
/** Signals the declared browser observer after controlled DOM property writes, like Source's layout effect. */
export function inputMessageCommit(
  node: Html,
  value: string,
  minRows: number,
  maxRows: number,
  editRevision: number,
): Html {
  if (node === null) return null
  const previous = node.data?.hook
  const revision = JSON.stringify([value, minRows, maxRows, editRevision])
  return {
    ...node,
    data: {
      ...node.data,
      hook: {
        ...previous,
        postpatch(before, after) {
          previous?.postpatch?.(before, after)
          if (
            !(after.elm instanceof HTMLElement) ||
            ('fluidMessageResizeRevision' in after.elm &&
              after.elm.fluidMessageResizeRevision === revision)
          )
            return
          Reflect.set(after.elm, 'fluidMessageResizeRevision', revision)
          after.elm.dispatchEvent(new CustomEvent(INPUT_MESSAGE_COMMIT_EVENT))
        },
        insert(vnode) {
          previous?.insert?.(vnode)
          if (vnode.elm instanceof HTMLElement)
            Reflect.set(vnode.elm, 'fluidMessageResizeRevision', revision)
        },
        destroy(vnode) {
          if (vnode.elm instanceof HTMLElement)
            Reflect.deleteProperty(vnode.elm, 'fluidMessageResizeRevision')
          previous?.destroy?.(vnode)
        },
      },
    },
  }
}
