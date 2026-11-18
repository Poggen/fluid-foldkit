import { constUndefined } from 'effect/Function'
import { animateSingleValue, motionValue } from 'motion-dom'
import { createSvgChartRenderer } from '@tanstack/charts/svg/renderer'
import type { PieArcRow } from './arc'
import type { pieGeometry } from './definition'
import type { PieChartProps } from './options'
import { createPieGrowMotion } from './grow-motion'
import { mountProgressOptions } from '../kit/motion/transition-options'

type Geometry = ReturnType<typeof pieGeometry>

/** Keep the actual annular geometry during reveal; radial-sweep interpolation fills the donut hole. */
export function createPieEntranceRenderer() {
  const base = createSvgChartRenderer<PieArcRow, number, number>()
  let geometry: Geometry | undefined
  let props: PieChartProps | undefined
  let hovered: number | null = null
  const hoverListeners = new Set<() => void>()
  const currentGeometry = () => geometry

  const filterOf = (row: PieArcRow) =>
    row.showGlow && hovered === row.sliceIndex ? `drop-shadow(0 0 12px ${row.glowColor})` : 'none'

  const createSlice = (
    row: PieArcRow,
    path: SVGPathElement,
    delay: number,
    complete: boolean,
    initialRadius: number,
    enterTransition: PieChartProps['enterTransition'],
    initialFilter = filterOf(row),
  ) => {
    const progress = motionValue(0)
    let grow: ReturnType<typeof createPieGrowMotion> | undefined

    const state = {
      row,
      path,
      progress,
      complete,
      delay,
      initialFilter,
      stop: constUndefined,
      draw: () => {
        const current = currentGeometry()

        if (current === undefined) {
          return
        }

        state.path.style.filter = state.initialFilter
        const hot = hovered === state.row.sliceIndex
        const targetRadius = current.outerRadius + (hot ? state.row.offset : 0)
        grow?.retarget(targetRadius)

        if (state.complete && grow !== undefined) {
          grow.paintComplete(state.path, current.pathAt(state.row, targetRadius))

          return
        }

        const value = state.complete ? 1 : progress.get()
        const arc = state.row
        const endAngle = arc.startAngle + (arc.endAngle - arc.startAngle) * value

        if (state.complete) {
          state.path.setAttribute('d', current.pathAt(arc, current.outerRadius))
        } else {
          const pathString =
            endAngle <= arc.startAngle + 0.01
              ? ''
              : current.pathAt({ ...arc, endAngle }, grow?.radius() ?? current.outerRadius)

          state.path.setAttribute('d', pathString)
        }
      },
    }

    if (row.effect === 'grow') {
      grow = createPieGrowMotion(initialRadius, state.draw)
    }

    const release = progress.on('change', (value) => {
      if (value >= 1 && !state.complete) {
        state.initialFilter = filterOf(state.row)
        state.complete = true
      }

      state.draw()
    })

    const controls = row.animate
      ? animateSingleValue(progress, 1, {
          ...mountProgressOptions(enterTransition),
          delay,
        })
      : undefined

    state.stop = () => {
      controls?.stop()
      release()
      progress.destroy()
      grow?.destroy()
    }

    state.draw()

    return state
  }

  const renderer: typeof base = {
    ...base,
    mount(container, options) {
      const surface = base.mount(container, options)

      const roles = new Map<number, ReturnType<typeof createSlice>>()

      const retainedFilter = (
        prior: ReturnType<typeof createSlice> | undefined,
        row: PieArcRow,
        sameComponent: boolean,
      ) => {
        if (
          prior !== undefined &&
          prior.row.animate === row.animate &&
          (!row.animate ||
            (sameComponent && (prior.complete || prior.row.sliceIndex === row.sliceIndex)))
        ) {
          return prior.initialFilter
        }

        return filterOf(row)
      }

      const paintHover = () => {
        for (const state of roles.values()) {
          state.draw()
        }
      }

      hoverListeners.add(paintHover)

      const { render } = surface
      const { destroy } = surface
      surface.render = (scene, ...args) => {
        render(scene, ...args)
        const { element } = surface

        if (element instanceof SVGElement) {
          element.classList.add('[contain:layout_style_paint]')
          element.classList.add('overflow-hidden!')
        }

        if (geometry === undefined || props === undefined) {
          return
        }

        const seen = new Set<number>()

        for (const row of geometry.rows) {
          const path = surface.element.querySelector<SVGPathElement>(
            `g.bkm-pie-role${row.roleIndex} path`,
          )

          if (path === null) {
            continue
          }

          seen.add(row.roleIndex)
          const delay = (0.1 + row.sliceIndex * 0.08) * (props.enterStaggerScale ?? 1)
          const prior = roles.get(row.roleIndex)

          const sameComponent =
            prior !== undefined &&
            prior.row.animate === row.animate &&
            (prior.row.effect === 'grow') === (row.effect === 'grow')

          if (
            sameComponent &&
            prior.row.sliceIndex === row.sliceIndex &&
            prior.row.animate === row.animate &&
            prior.delay === delay
          ) {
            prior.row = row
            prior.path = path
            prior.draw()
            continue
          }

          prior?.stop()

          const state = createSlice(
            row,
            path,
            delay,
            !row.animate || (sameComponent && prior.complete),
            geometry.outerRadius,
            props.enterTransition,
            retainedFilter(prior, row, sameComponent),
          )

          roles.set(row.roleIndex, state)
        }

        for (const [index, state] of roles) {
          if (!seen.has(index)) {
            state.stop()
            roles.delete(index)
          }
        }
      }

      surface.destroy = () => {
        for (const role of roles.values()) {
          role.stop()
        }

        roles.clear()
        hoverListeners.delete(paintHover)
        destroy()
      }

      return {
        renderer,
        get element() {
          return surface.element
        },
        supportsStateFocus: true,
        render: surface.render,
        paintFocus: (...args) => surface.paintFocus(...args),
        clientToScene: (scene, x, y) => surface.clientToScene?.(scene, x, y) ?? null,
        destroy: surface.destroy,
      }
    },
  }

  return {
    renderer,
    hover(index: number | null) {
      hovered = index

      for (const listener of hoverListeners) {
        listener()
      }
    },
    configure(nextGeometry: Geometry, nextProps: PieChartProps, focused: number | null) {
      geometry = nextGeometry
      props = nextProps
      hovered = focused
    },
  }
}
