import { pillFontMeasurement } from '../cartesian/pill-font-measurement'
import { cartesianCssScope, mountCartesianCssScope } from '../cartesian/css-scope'
import { mountBarCategoryXAxis } from './category-x-axis'
import { pulseClipResource, pulseClipCss } from './pulse-clips'
import { mountBarCategoryYAxis } from './category-y-axis'
import { barEntranceResource } from './entrance-resource'
import { Predicate } from 'effect'
import { barViewport } from './view-context'
import type { CartesianResource, NativeObservation } from '../cartesian/native-resource'
import { applyChartStyle, replaceChartStyle, bklitSurfaceStyle } from '../cartesian/style'
import { HoverOverlay } from '../cartesian/hover-overlay'
import { readyGateCss, focusEmptyHiddenCss } from '../cartesian/gate-css'
import { pillLayout } from '../cartesian/date-pill'
import { barDimCss } from './hover'
import { barLoading } from './loading'
import type { BarChartProps } from './options'
import type { BarDatum } from './model'
import type { BarSnapshot, BarValue } from './definition'
import { hasSquarePaints } from './square-paints'

export function mountBarResource<Row extends Readonly<Record<string, unknown>>>(
  element: HTMLElement,
  observe: NativeObservation,
  initialProps: BarChartProps<Row>,
  id: string,
  clock: () => number,
): CartesianResource<Row, BarDatum<Row>, BarValue, BarValue, BarSnapshot<Row>, BarChartProps<Row>> {
  const releaseCssScope = mountCartesianCssScope(element, id)
  let props = initialProps
  const entrance = barEntranceResource(element, () => props)

  const previousStyle = element.getAttribute('style')
  element.dataset.bkmKit = id
  element.dataset.bkmBar = ''
  applyChartStyle(element, { ...bklitSurfaceStyle, ...props.style })
  const overlay = new HoverOverlay<Row>(id, clock)
  const categoryYAxis = mountBarCategoryYAxis(element)
  const categoryXAxis = mountBarCategoryXAxis(element)
  const pulseClips = pulseClipResource(element)
  const stylesheet = document.createElement('style')
  const scope = cartesianCssScope(id).selector
  const viewportClip = ''
  stylesheet.textContent = viewportClip
  element.append(stylesheet, overlay.root)
  const loading = barLoading<Row>(element, `${id}-bar-sweep`, observe)
  const pillFonts = pillFontMeasurement(element)
  const textWidth = pillFonts.measure

  let snapshot: BarSnapshot<Row> | undefined
  let domainKey = ''
  let generation = -1
  let timer = 0
  let cancelled = false

  return {
    get fontMetricsChanged() {
      return props.renderContext === undefined ? pillFonts.changed : undefined
    },
    configure: (next) => {
      replaceChartStyle(
        element,
        { ...bklitSurfaceStyle, ...props.style },
        { ...bklitSurfaceStyle, ...next.style },
      )
      props = next
    },
    prepare: (state) => {
      loading.prepare(state)
    },
    attach: (...args: Parameters<typeof entrance.attach>) => {
      entrance.attach(...args)
    },
    draw: (next) => {
      pillFonts.begin()
      snapshot = next
      entrance.draw(next)
      categoryYAxis.draw(next, props)
      categoryXAxis.draw(next, props)
      pulseClips.draw(next.pulseClips)

      if (props.renderContext !== undefined || hasSquarePaints(props)) {
        const key = JSON.stringify([
          next.width,
          next.height,
          next.margin,
          next.valueDomains,
          next.data.length,
        ])

        if (key !== domainKey) {
          domainKey = key
          queueMicrotask(() => {
            if (!cancelled) {
              observe.domains(next.valueDomains, next.valueDomains, barViewport(next))
            }
          })
        }
      }

      loading.draw(next)
      const horizontal = props.orientation === 'horizontal'

      const tickStyle = {
        prefix: horizontal ? 'y-tick-label:' : 'x-tick-label:',
        ms: horizontal ? 150 : 400,
        positions: next.tickPositions,
      }

      const ramp =
        props.children.find((child) => child.kind === 'barXAxis')?.props.tickerHalfWidth ?? 50

      const dim = barDimCss(
        scope,
        next.hover,
        horizontal ? tickStyle : { ...tickStyle, ramp },
        next.categories.length,
      )

      stylesheet.textContent = `${viewportClip}${pulseClipCss(id, next.pulseClips)}${readyGateCss(scope, true)}${focusEmptyHiddenCss(scope)}${dim}${next.frontCss}`

      const model = Predicate.isNullish(next.overlay?.pill)
        ? next.overlay
        : {
            ...next.overlay,
            pill: {
              ...next.overlay.pill,
              layout: pillLayout(next.overlay.pill.labels, textWidth),
            },
          }

      overlay.update(
        model,
        {
          height: next.height,
          innerWidth: next.width - next.margin.left - next.margin.right,
          innerHeight: next.height - next.margin.top - next.margin.bottom,
          xDomain: [0, next.categories.length - 1],
          yDomains: Object.fromEntries(
            Object.entries(next.valueDomains).map(([axisId, domain]) => [
              axisId === 'left' ? 'y' : `y:${axisId}`,
              domain,
            ]),
          ),
        },
        next.margin,
      )

      for (const [name, value] of Object.entries(next.gridAttrs)) {
        if (value === undefined) {
          element.removeAttribute(name)
        } else {
          element.setAttribute(name, value)
        }
      }

      pillFonts.commit()
    },
    update: (state, data, focusedIndex) => {
      entrance.update(state)
      loading.update(state)

      if (state.revealReady && state.configuration.status === 'ready') {
        element.dataset.bkmReady = ''
      } else {
        delete element.dataset.bkmReady
      }

      if (state.configuration.status === 'loading') {
        element.dataset.bkmStatus = 'loading'
      } else {
        delete element.dataset.bkmStatus
      }

      const row = focusedIndex === null ? undefined : data[focusedIndex]

      const active =
        state.revealReady &&
        state.configuration.status === 'ready' &&
        row !== undefined &&
        focusedIndex !== null

      if (active) {
        element.dataset.bkmOn = ''
        element.dataset.hover = String(focusedIndex)

        if (snapshot !== undefined) {
          element.style.setProperty(
            '--bkm-bfx',
            String(snapshot.focusXs[focusedIndex] ?? snapshot.margin.left),
          )
        }
      } else {
        delete element.dataset.hover
        delete element.dataset.bkmOn
      }

      overlay.focus(active ? focusedIndex : null, active ? row : null)
      categoryYAxis.focus(active ? focusedIndex : null)
      categoryXAxis.focus(active ? focusedIndex : null)

      if (generation === state.generation) {
        return
      }

      ;({ generation } = state)
      window.clearTimeout(timer)
      const current = state.generation

      if (!state.phaseClockReady) {
        queueMicrotask(() => {
          if (!cancelled && generation === current) {
            observe.timing(current, null, clock())
          }
        })
      }

      if (!state.revealReady && state.configuration.status === 'ready') {
        timer = window.setTimeout(
          () => {
            if (!cancelled && generation === current) {
              observe.revealed(current)
            }
          },
          Math.max(0, state.configuration.animationDuration * (data.length > 1 ? 1.4 : 1)),
        )
      }
    },
    destroy: () => {
      cancelled = true
      entrance.destroy()
      window.clearTimeout(timer)
      loading.destroy()
      overlay.destroy()
      categoryYAxis.destroy()
      categoryXAxis.destroy()
      pulseClips.destroy()
      stylesheet.remove()
      releaseCssScope()
      delete element.dataset.hover
      delete element.dataset.bkmBar
      delete element.dataset.bkmKit

      if (previousStyle === null) {
        element.removeAttribute('style')
      } else {
        element.setAttribute('style', previousStyle)
      }
    },
  }
}
