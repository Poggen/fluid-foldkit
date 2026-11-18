import type { BarSnapshot } from './definition'
import type { Interaction } from '../cartesian/state'
import type { NativeObservation } from '../cartesian/native-resource'

const NS = 'http://www.w3.org/2000/svg'

const node: <Tag extends keyof SVGElementTagNameMap>(
  tag: Tag,
  attrs?: Readonly<Record<string, string | number>>,
) => SVGElementTagNameMap[Tag] = <Tag extends keyof SVGElementTagNameMap>(
  tag: Tag,
  attrs: Readonly<Record<string, string | number>> = {},
) => {
  const element = document.createElementNS(NS, tag)

  for (const [key, value] of Object.entries(attrs)) {
    element.setAttribute(key, String(value))
  }

  return element satisfies SVGElementTagNameMap[Tag]
}

export function barLoading<Row>(element: HTMLElement, id: string, observe: NativeObservation) {
  const svg = node('svg', { 'aria-hidden': 'true' })
  svg.setAttribute(
    'class',
    'absolute overflow-visible pointer-events-none left-[var(--bkm-loading-left)] top-[var(--bkm-loading-top)]',
  )
  const defs = node('defs')
  const gradient = node('linearGradient', { id: `${id}-grad`, x1: 0, x2: 1, y1: 0, y2: 0 })

  for (let index = 0; index < 17; index++) {
    const fraction = index / 16
    gradient.append(
      node('stop', {
        offset: `${(fraction * 100).toFixed(0)}%`,
        'stop-color': 'white',
        'stop-opacity': Number((0.05 + Math.sin(fraction * Math.PI) ** 2 * 0.85).toFixed(3)),
      }),
    )
  }

  const mask = node('mask', { id: `${id}-mask`, maskUnits: 'userSpaceOnUse' })
  const rotate = node('g')
  const band = node('rect', { x: 0, fill: `url(#${id}-grad)` })
  band.classList.add('[animation:bkm-sweep-travel_2s_linear_infinite]')
  rotate.append(band)
  mask.append(rotate)
  defs.append(gradient, mask)
  const group = node('g')
  svg.append(defs, group)
  element.append(svg)
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  let state: Interaction | undefined
  let snapshot: BarSnapshot<Row> | undefined
  let mounted = false
  let last = ''

  const render = () => {
    if (snapshot === undefined || state === undefined) {
      return
    }

    const loading = state.configuration.status === 'loading'
    const width = Math.max(0, snapshot.width - snapshot.margin.left - snapshot.margin.right)
    const height = Math.max(0, snapshot.height - snapshot.margin.top - snapshot.margin.bottom)
    svg.classList.toggle('hidden', !(loading && width > 0 && height > 0))

    if (!loading) {
      if (mounted) {
        mounted = false
        observe.sweep({ kind: 'removed', seriesId: 'bar-skeleton', generation: state.generation })
      }

      return
    }

    if (!mounted) {
      mounted = true
      const generation = state.generation
      queueMicrotask(() => {
        if (mounted) {
          observe.sweep({ kind: 'mounted', seriesId: 'bar-skeleton', generation })
        }
      })
    }

    svg.style.setProperty('--bkm-loading-left', `${snapshot.margin.left}px`)
    svg.style.setProperty('--bkm-loading-top', `${snapshot.margin.top}px`)
    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    const seed = state.sweepCycles['bar-skeleton'] ?? 0
    const count = snapshot.data.length || 12
    const key = JSON.stringify([width, height, seed, count, media.matches])

    if (key === last) {
      return
    }

    last = key
    const bandWidth = width / count
    group.replaceChildren(
      ...Array.from({ length: count }, (_, index) => {
        const hash = Math.sin((index + 1) * 12.9898 + seed) * 43_758.5453
        const value = 20 + Math.floor((hash - Math.floor(hash)) * 60)
        const barHeight = Math.max(1, (height * value) / 100)

        return node('rect', {
          fill: 'var(--bkm-foreground)',
          'fill-opacity': 0.45,
          height: barHeight,
          rx: 2,
          width: bandWidth * 0.7,
          x: index * bandWidth + bandWidth * 0.15,
          y: height - barHeight,
        })
      }),
    )

    if (media.matches) {
      defs.remove()
      group.removeAttribute('mask')
    } else {
      if (defs.parentNode === null) {
        svg.prepend(defs)
      }

      band.setAttribute('width', String(width))
      band.setAttribute('height', String(height * 3))
      band.setAttribute('y', String(-height))
      band.style.setProperty('--bkm-sweep-w', `${width}px`)
      rotate.setAttribute('transform', `rotate(25 ${width / 2} ${height / 2})`)
      group.setAttribute('mask', `url(#${id}-mask)`)
    }
  }

  const cycle = () => {
    if (mounted && state !== undefined) {
      observe.sweep({ kind: 'cycle', seriesId: 'bar-skeleton', generation: state.generation })
    }
  }

  band.addEventListener('animationiteration', cycle)
  media.addEventListener('change', render)

  return {
    prepare: (next: Interaction) => {
      state = next
    },
    draw: (next: BarSnapshot<Row>) => {
      snapshot = next
      render()
    },
    update: (next: Interaction) => {
      state = next
      render()
    },
    destroy: () => {
      mounted = false
      band.removeEventListener('animationiteration', cycle)
      media.removeEventListener('change', render)
      svg.remove()
    },
  }
}
