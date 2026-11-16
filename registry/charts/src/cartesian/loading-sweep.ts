import { area as d3Area, line as d3Line } from 'd3-shape'
import type { CurveFactory } from 'd3-shape'
import type { CartesianSnapshot } from './definition'
import type { NativeObservation } from './native-resource'
import type { Interaction } from './state'
import type { ResolvedSeries } from './series'

const NS = 'http://www.w3.org/2000/svg'

const node = <Tag extends keyof SVGElementTagNameMap>(
  tag: Tag,
  attributes: Readonly<Record<string, string | number>> = {},
): SVGElementTagNameMap[Tag] => {
  const element = document.createElementNS(NS, tag)

  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value))
  }

  return element
}

const hashFract = (value: number): number => {
  const x = Math.sin(value) * 43_758.5453

  return x - Math.floor(x)
}

const paths = (curve: CurveFactory, width: number, height: number, seed: number) => {
  const points = Array.from({ length: 14 }, (_, index) => ({
    index,
    value: 20 + Math.floor(hashFract((index + 1) * 12.9898 + seed) * 60),
  }))

  const x = (point: (typeof points)[number]) => (point.index / 13) * width
  const y = (point: (typeof points)[number]) => height - (point.value / 100) * height

  return {
    line: d3Line<(typeof points)[number]>().curve(curve).x(x).y(y)(points) ?? '',
    area: d3Area<(typeof points)[number]>().curve(curve).x(x).y0(height).y1(y)(points) ?? '',
  }
}

function silhouette(id: string, observeCycle: () => void) {
  const root = node('g')
  const defs = node('defs')
  const gradient = node('linearGradient', { id: `${id}-grad`, x1: '0', x2: '1', y1: '0', y2: '0' })

  for (let i = 0; i < 17; i++) {
    const t = i / 16
    gradient.append(
      node('stop', {
        offset: `${(t * 100).toFixed(0)}%`,
        'stop-color': 'white',
        'stop-opacity': Number((0.05 + Math.sin(t * Math.PI) ** 2 * 0.85).toFixed(3)),
      }),
    )
  }

  const mask = node('mask', { id: `${id}-mask`, maskUnits: 'userSpaceOnUse' })
  const rotation = node('g')
  const band = node('rect', { fill: `url(#${id}-grad)`, x: 0 })
  band.classList.add('[animation:bkm-sweep-travel_2s_linear_infinite]')
  band.addEventListener('animationiteration', observeCycle)
  rotation.append(band)
  mask.append(rotation)

  const areaGradient = node('linearGradient', {
    id: `${id}-area`,
    x1: '0',
    x2: '0',
    y1: '0',
    y2: '1',
  })

  const top = node('stop', { offset: '0%', 'stop-opacity': 0.18 })
  const bottom = node('stop', { offset: '100%', 'stop-opacity': 0.02 })
  areaGradient.append(top, bottom)
  defs.append(gradient, mask, areaGradient)
  const group = node('g')
  const area = node('path', { fill: `url(#${id}-area)` })
  const line = node('path', { fill: 'none', 'stroke-linecap': 'round' })
  root.append(defs, group)

  return {
    root,
    update: (
      series: ResolvedSeries,
      width: number,
      height: number,
      seed: number,
      exiting: boolean,
      reduced: boolean,
    ) => {
      const shape = paths(series.curve, width, height, seed)
      const mode = exiting ? 'exit' : (series.loading?.mode ?? 'loop')
      const stroke = series.loading?.stroke ?? 'var(--chart-foreground)'
      area.setAttribute('d', shape.area)
      line.setAttribute('d', shape.line)
      line.setAttribute('stroke', stroke)
      line.setAttribute('stroke-opacity', String(series.loading?.strokeOpacity ?? 0.55))
      line.setAttribute('stroke-width', String(series.strokeWidth))
      top.setAttribute('stop-color', stroke)
      bottom.setAttribute('stop-color', stroke)

      if (series.kind === 'area') {
        if (area.parentElement === null) {
          group.prepend(area)
        }
      } else {
        area.remove()
      }

      if (line.parentElement === null) {
        group.append(line)
      }

      if (reduced) {
        defs.replaceChildren(...(series.kind === 'area' ? [areaGradient] : []))
        group.removeAttribute('mask')
        group.classList.remove(
          '[animation:bkm-sweep-fade-enter_0.45s_cubic-bezier(0.85,0,0.15,1)_forwards]',
          '[animation:bkm-sweep-fade-exit_0.45s_cubic-bezier(0.85,0,0.15,1)_forwards]',
        )
      } else {
        if (gradient.parentElement === null) {
          defs.prepend(gradient, mask)
        }

        if (series.kind === 'area' && areaGradient.parentElement === null) {
          defs.append(areaGradient)
        }

        if (series.kind !== 'area') {
          areaGradient.remove()
        }

        band.setAttribute('height', String(height * 3))
        band.setAttribute('width', String(width))
        band.setAttribute('y', String(-height))
        band.style.setProperty('--bkm-sweep-w', `${width}px`)
        rotation.setAttribute('transform', `rotate(25 ${width / 2} ${height / 2})`)
        group.setAttribute('mask', `url(#${id}-mask)`)
        group.classList.toggle(
          '[animation:bkm-sweep-fade-enter_0.45s_cubic-bezier(0.85,0,0.15,1)_forwards]',
          mode === 'enter',
        )
        group.classList.toggle(
          '[animation:bkm-sweep-fade-exit_0.45s_cubic-bezier(0.85,0,0.15,1)_forwards]',
          mode === 'exit',
        )
      }
    },
    destroy: () => {
      band.removeEventListener('animationiteration', observeCycle)
      root.remove()
    },
  }
}

export function loadingSweeps<Row>(element: HTMLElement, id: string, observe: NativeObservation) {
  const root = node('svg', { 'aria-hidden': 'true' })
  root.setAttribute(
    'class',
    'absolute pointer-events-none overflow-visible z-[1] left-[var(--bkm-loading-left)] top-[var(--bkm-loading-top)]',
  )
  element.append(root)
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  const items = new Map<string, ReturnType<typeof silhouette>>()
  const pendingMounts = new Set<string>()
  let snapshot: CartesianSnapshot<Row> | undefined
  let state: Interaction | undefined

  const render = () => {
    if (snapshot === undefined) {
      return
    }

    const { innerWidth: width, innerHeight: height, margin } = snapshot
    const series = snapshot.series.filter((series) => series.loading?.style === 'sweep')
    root.classList.toggle('hidden', !(width > 0 && height > 0 && series.length > 0))
    root.style.setProperty('--bkm-loading-left', `${margin.left}px`)
    root.style.setProperty('--bkm-loading-top', `${margin.top}px`)
    root.setAttribute('width', String(width))
    root.setAttribute('height', String(height))

    for (const [key, item] of items) {
      if (!series.some((series) => series.id === key)) {
        item.destroy()
        items.delete(key)
        pendingMounts.delete(key)

        if (state !== undefined) {
          observe.sweep({ kind: 'removed', generation: state.generation, seriesId: key })
        }
      }
    }

    for (const [index, seriesItem] of series.entries()) {
      let item = items.get(seriesItem.id)

      if (item === undefined) {
        item = silhouette(`${id}-line-sweep-${index}`, () => {
          if (
            state !== undefined &&
            state.phase !== 'exiting' &&
            (snapshot?.series.find((series) => series.id === seriesItem.id)?.loading?.mode ??
              'loop') === 'loop'
          ) {
            observe.sweep({ kind: 'cycle', generation: state.generation, seriesId: seriesItem.id })
          }
        })
        items.set(seriesItem.id, item)
        pendingMounts.add(seriesItem.id)
        root.append(item.root)
      }

      item.update(
        seriesItem,
        width,
        height,
        pendingMounts.has(seriesItem.id) ? 0 : (state?.sweepCycles[seriesItem.id] ?? 0),
        state?.phase === 'exiting',
        media.matches,
      )

      if (state !== undefined && pendingMounts.delete(seriesItem.id)) {
        const generation = state.generation
        const mounted = item
        queueMicrotask(() => {
          if (items.get(seriesItem.id) === mounted) {
            observe.sweep({ kind: 'mounted', generation, seriesId: seriesItem.id })
          }
        })
      }
    }
  }

  media.addEventListener('change', render)

  return {
    prepare: (next: Interaction) => {
      state = next
    },
    draw: (next: CartesianSnapshot<Row>) => {
      snapshot = next
      render()
    },
    update: (next: Interaction) => {
      state = next
      render()
    },
    destroy: () => {
      media.removeEventListener('change', render)

      for (const item of items.values()) {
        item.destroy()
      }

      items.clear()
      pendingMounts.clear()
      root.remove()
    },
  }
}
