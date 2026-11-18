import type { Html } from 'foldkit/html'

/** Keeps an exiting footer button at its last layout box while siblings reflow. */
export const askPopLayout: (vnode: Html, present: boolean) => Html = function askPopLayout(
  vnode: Html,
  present: boolean,
) {
  if (vnode === null) {
    return null
  }

  const previous = vnode.data?.hook

  let box:
    | {
        readonly left: number
        readonly top: number
        readonly width: number
        readonly height: number
      }
    | undefined

  return {
    ...vnode,
    data: {
      ...vnode.data,
      hook: {
        ...previous,
        prepatch(oldNode, node) {
          previous?.prepatch?.(oldNode, node)

          if (!present && oldNode.elm instanceof HTMLElement) {
            box = {
              left: oldNode.elm.offsetLeft,
              top: oldNode.elm.offsetTop,
              width: oldNode.elm.offsetWidth,
              height: oldNode.elm.offsetHeight,
            }
          }
        },
        postpatch(oldNode, node) {
          previous?.postpatch?.(oldNode, node)

          if (!(node.elm instanceof HTMLElement)) {
            return
          }

          if (!present && box) {
            Object.assign(node.elm.style, {
              position: 'absolute',
              left: `${box.left}px`,
              top: `${box.top}px`,
              width: `${box.width}px`,
              height: `${box.height}px`,
            })
          } else if (present) {
            node.elm.style.removeProperty('position')
            node.elm.style.removeProperty('left')
            node.elm.style.removeProperty('top')
            node.elm.style.removeProperty('width')
            node.elm.style.removeProperty('height')
          }
        },
      },
    },
  }
}
