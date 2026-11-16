import { cartesianCssScope } from '../cartesian/css-scope'
import { inertHtml as h } from 'foldkit/html'
import { cssAttr } from './hover'

export interface PulseClip {
  readonly id: string
  readonly className: string
  readonly path: string
}

export const pulseClipCss = (uid: string, clips: ReadonlyArray<PulseClip>) => {
  const scope = cartesianCssScope(uid).selector

  const clipRules = clips
    .map((clip) => `${scope} .${clip.className}{--bkm-pulse-clip:url("#${cssAttr(clip.id)}")}`)
    .join('')

  return clipRules
}

export function pulseClipView(uid: string, clips: ReadonlyArray<PulseClip>) {
  return clips.length === 0
    ? h.empty
    : h.svg(
        [
          h.Class('absolute [width:0] [height:0] overflow-hidden'),
          h.Width('0'),
          h.Height('0'),
          h.AriaHidden(true),
        ],
        [
          h.style([], [pulseClipCss(uid, clips)]),
          h.defs(
            [],
            clips.map((clip) =>
              h.clipPath(
                [h.Id(clip.id), h.Attribute('clipPathUnits', 'userSpaceOnUse')],
                [h.path([h.D(clip.path)])],
              ),
            ),
          ),
        ],
      )
}

/** The existing Bar Layer owns only definitions; the existing pulse sweep remains the sole animation. */
export function pulseClipResource(element: HTMLElement) {
  const ns = 'http://www.w3.org/2000/svg'
  let root: SVGSVGElement | undefined
  let defs: SVGDefsElement | undefined
  let disposed = false
  const paths = new Map<string, SVGPathElement>()

  const clear = () => {
    root?.remove()
    root = undefined
    defs = undefined
    paths.clear()
  }

  return {
    draw(clips: ReadonlyArray<PulseClip>) {
      if (disposed) {
        return
      }

      if (clips.length === 0) {
        clear()

        return
      }

      if (root === undefined) {
        root = document.createElementNS(ns, 'svg')
        root.setAttribute('width', '0')
        root.setAttribute('height', '0')
        root.setAttribute('aria-hidden', 'true')
        root.setAttribute('class', 'absolute w-0 h-0 overflow-hidden')
        defs = document.createElementNS(ns, 'defs')
        root.append(defs)
        element.append(root)
      }

      const wanted = new Set(clips.map((clip) => clip.id))

      for (const [id, path] of paths) {
        if (!wanted.has(id)) {
          path.parentElement?.remove()
          paths.delete(id)
        }
      }

      for (const clip of clips) {
        let path = paths.get(clip.id)

        if (path === undefined) {
          const owner = document.createElementNS(ns, 'clipPath')
          owner.id = clip.id
          owner.setAttribute('clipPathUnits', 'userSpaceOnUse')
          path = document.createElementNS(ns, 'path')
          owner.append(path)
          defs?.append(owner)
          paths.set(clip.id, path)
        }

        path.setAttribute('d', clip.path)
      }
    },
    destroy() {
      disposed = true
      clear()
    },
  }
}
