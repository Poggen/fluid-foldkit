import type { FamilyResourceElements } from './family-root'
import { pillFontMeasurement } from './pill-font-measurement'
import { mountCartesianCssScope } from './css-scope'
import { gridMaskResource } from './grid-mask'
import { scatterPaintResource } from '../scatter/paint'
import { scatterEntranceResource } from '../scatter/entrance-resource'
import { candleEntranceResource } from '../candlestick/entrance-resource'
import { loadingPulses } from './loading-pulse'
import { revealClipResource } from './reveal-clip-resource'
import { markerEnterResource } from './marker-enter-resource'
import { timeSeriesDomainResource } from './time-series-domain-resource'
import type { TimeSeriesCompiler } from './time-series-domain-resource'
import {
  paintTimeSeriesGeometry,
  paintTimeSeriesFocus,
  timeSeriesResourceCss,
} from './time-series-paint'
import { mountEventMarkerResource } from './event-marker-resource'
import { paintTimeSeriesStatus } from './time-series-status'
import { measuredOverlayPill, timeSeriesHoverModel } from './time-series-overlay'
import { constVoid } from 'effect/Function'
import type { ChartPhase } from '../kit/motion/phase'
import { timeSeriesPublication } from './time-series-publication'
import type { ModelViewportDemand } from './time-series-publication'
import { loadingSweeps } from './loading-sweep'
import { mergeTooltipCarriers } from './tooltip-carriers'
import { Option } from 'effect'
import type { CartesianSnapshot } from './definition'
import type { CartesianResource, NativeObservation } from './native-resource'
import type { Interaction } from './state'
import { loadingFlags, phasePlan } from './state'
import { HoverOverlay, overlayPlotOf } from './hover-overlay'
import type { TimeSeriesProps } from './root-options'
import { loadingLabel } from './loading-label'
import { pointerObservations } from './pointer-observations'
import { applyChartStyle, replaceChartStyle, bklitSurfaceStyle } from './style'
import { bandSpring } from './band-spring'

export function mountTimeSeriesResource<
  Row extends Readonly<Record<string, unknown>>,
  SceneDatum = Row,
>(
  target: FamilyResourceElements,
  observe: NativeObservation,
  initialProps: TimeSeriesProps<Row>,
  id: string,
  clock: () => number,
  phases: {
    readonly modelViewport: ModelViewportDemand
    readonly phaseOf?: (state: Interaction) => ChartPhase | null
    readonly notifyOnCallbackChange?: boolean
    readonly compile?: TimeSeriesCompiler<Row, SceneDatum>
  },
): CartesianResource<Row, SceneDatum> {
  const { drawingHost: element, visualRoot } = target
  const releaseCssScope = mountCartesianCssScope(element, id)
  let props = initialProps
  const releaseMarkers = mountEventMarkerResource(element, () => props.children, clock)

  const originalStyle = element.getAttribute('style')
  const hadRelativeClass = element.classList.contains('relative')
  const hadSelectionClass = element.classList.contains('select-none')
  const hadWidthClass = element.classList.contains('[width:var(--bkm-native-width)]')
  const hadHeightClass = element.classList.contains('[height:var(--bkm-native-height)]')

  const originalAttributes = new Map(
    element
      .getAttributeNames()
      .filter((name) => name.startsWith('data-bkm-'))
      .map((name) => [name, element.getAttribute(name) ?? '']),
  )

  const overlay = new HoverOverlay<Row>(id, clock)
  const stylesheet = document.createElement('style')
  const bandSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const gridMasks = gridMaskResource(bandSvg)
  const drawScatterPaint = scatterPaintResource(bandSvg)
  bandSvg.setAttribute('width', '0')
  bandSvg.setAttribute('height', '0')
  bandSvg.classList.add('absolute')
  const clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
  clip.id = `${id}-hlband`
  clip.setAttribute('clipPathUnits', 'userSpaceOnUse')
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('y', '-1000')
  rect.setAttribute('height', '10000')
  const band = bandSpring(rect, clock)
  let bandActive = false
  clip.append(rect)
  bandSvg.append(clip)
  let labelView = loadingLabel(props.loadingLabel ?? '')
  let label = labelView.element

  if (props.status !== 'loading' && (props.animationDuration ?? 1100) > 0) {
    element.dataset.bkmWipeIn = ''
  }

  const legend = document.createElement('div')
  legend.className = 'bkm-native-legend'
  element.dataset.bkmKit = id
  if (visualRoot === undefined) {
    element.classList.add('select-none')
    element.classList.add('relative')
    element.classList.add('[width:var(--bkm-native-width)]')
    element.style.setProperty(
      '--bkm-native-width',
      props.width === undefined ? '100%' : `${props.width}px`,
    )
    element.classList.toggle('[height:var(--bkm-native-height)]', props.height !== undefined)
    if (props.height !== undefined)
      element.style.setProperty('--bkm-native-height', `${props.height}px`)
    applyChartStyle(element, { ...bklitSurfaceStyle, ...props.style })
  }
  element.append(stylesheet, bandSvg, overlay.root, label, legend)

  const sweeps = loadingSweeps<Row>(element, id, observe)
  const pulses = phases.compile === undefined ? undefined : loadingPulses<Row>(element, id, observe)

  const reveal =
    phases.compile === undefined
      ? undefined
      : revealClipResource<Row>(element, id, () => props, observe)

  const markers =
    phases.compile === undefined ? undefined : markerEnterResource<Row>(element, id, () => props)

  const candles = initialProps.children.some((child) => child.kind === 'candlestick')
    ? candleEntranceResource<Row>(element, () => props)
    : undefined

  const scatter = initialProps.children.some((child) => child.kind === 'scatter')
    ? scatterEntranceResource<Row>(element)
    : undefined

  let snapshot: CartesianSnapshot<Row> | undefined
  let current: Interaction | undefined

  const domain =
    phases.compile === undefined
      ? undefined
      : timeSeriesDomainResource({
          clock,
          props: () => props,
          state: () => current,
          completed: observe.deadline,
          compile: phases.compile,
        })

  let releasePointer = constVoid

  let markerEpoch = false
  let clockGeneration = -1
  let timer = 0
  let frame = 0
  let revealTimer = 0
  let pulseStart: number | undefined
  let scheduledGeneration = -1
  let cancelled = false
  let latestData: ReadonlyArray<Row> = []
  let candidateKey: string | undefined
  let notifiedStatus: string | undefined
  let notifiedCallback: TimeSeriesProps<Row>['onPhaseChange']
  const pillFonts = pillFontMeasurement(visualRoot ?? element)
  const textWidth = pillFonts.measure

  const publication = timeSeriesPublication(
    observe,
    () => current,
    () => snapshot,
    () => phases.modelViewport === 'Always' || props.renderContext !== undefined,
  )

  const animate = (event: AnimationEvent) => {
    if (event.animationName === 'bkm-loading-pulse') {
      pulseStart = event.timeStamp
    }

    if (event.animationName === 'bkm-wipe-o' && event.type === 'animationend') {
      delete element.dataset.bkmWipeIn
    }

    if (event.type === 'animationiteration' && event.animationName === 'bkm-loading-pulse') {
      for (const item of props.children) {
        if (item.kind === 'line' && item.props.onLoadingPulseCycleComplete !== undefined) {
          item.props.onLoadingPulseCycleComplete()
          break
        }
      }
    }
  }

  element.addEventListener('animationstart', animate)
  element.addEventListener('animationiteration', animate)
  element.addEventListener('animationend', animate)

  const clear = () => {
    window.clearTimeout(timer)
    window.cancelAnimationFrame(frame)
    window.clearTimeout(revealTimer)
    timer = 0
    frame = 0
    revealTimer = 0
    delete element.dataset.bkmExit
  }

  let tooltip = mergeTooltipCarriers(props.children)

  const draw = (next: CartesianSnapshot<Row>) => {
    pillFonts.begin()
    snapshot = next
    gridMasks.draw(next.sourceGrid)
    drawScatterPaint(next.scatterPaint)
    domain?.draw()
    sweeps.draw(next)
    pulses?.draw(next)
    reveal?.draw(next)
    markers?.draw(next)
    candles?.draw(next)
    scatter?.draw(next)
    queueMicrotask(() => {
      if (cancelled) {
        return
      }

      candles?.refresh()
      scatter?.refresh()

      const indices =
        next.rowIndices ??
        next.rows.map((row) => latestData.indexOf(row)).filter((index) => index >= 0)

      const key = indices.join(',')

      if (candidateKey !== key) {
        candidateKey = key
        observe.candidates(indices)
      }
    })
    publication.draw(next)

    const margin = paintTimeSeriesGeometry(
      element,
      next,
      current?.configuration.animationDuration ?? props.animationDuration ?? 1100,
    )

    const css = timeSeriesResourceCss(id, next, props, tooltip, phases.compile !== undefined)

    if (stylesheet.textContent !== css) {
      stylesheet.textContent = css
    }

    if (props.xDomain !== undefined || (current !== undefined && Option.isSome(current.brush))) {
      element.dataset.bkmClip = ''
    } else {
      delete element.dataset.bkmClip
    }

    const model = timeSeriesHoverModel(
      next,
      props,
      tooltip,
      textWidth,
      phases.compile !== undefined,
    )

    const customOverlay = next.overlayModel

    overlay.update(
      customOverlay === undefined ? model : measuredOverlayPill(customOverlay, textWidth),
      overlayPlotOf(next),
      margin,
    )
    pillFonts.commit()
  }

  const reportPhase = (state: Interaction) => {
    const reportedPhase =
      phases.phaseOf === undefined ? state.configuration.status : phases.phaseOf(state)

    if (
      reportedPhase !== null &&
      (notifiedStatus !== reportedPhase ||
        (phases.notifyOnCallbackChange !== false && notifiedCallback !== props.onPhaseChange))
    ) {
      notifiedStatus = reportedPhase
      notifiedCallback = props.onPhaseChange
      props.onPhaseChange?.(reportedPhase)
    }
  }

  const beginGeneration = (state: Interaction) => {
    if (clockGeneration !== state.generation) {
      const acquired = clockGeneration === -1
      clear()
      clockGeneration = state.generation
      scheduledGeneration = -1

      if (
        state.phase === 'ready' &&
        !state.revealReady &&
        state.configuration.animationDuration > 0
      ) {
        if (!acquired && phases.compile !== undefined) {
          markerEpoch = !markerEpoch
        }

        element.dataset.bkmWipeIn = ''
      }

      if (
        state.phase === 'concealing' ||
        state.phase === 'tweenLoading' ||
        state.phase === 'swap'
      ) {
        pulseStart = undefined
      }

      if (!state.phaseClockReady) {
        const { generation } = state
        queueMicrotask(() => {
          if (!cancelled && current?.generation === generation) {
            observe.timing(
              generation,
              pulseStart === undefined ? null : clock() - pulseStart,
              clock(),
            )
          }
        })
      }
    }
  }

  const schedulePhase = (state: Interaction) => {
    if (state.phaseClockReady && scheduledGeneration !== state.generation) {
      scheduledGeneration = state.generation

      const plan =
        domain?.schedule(state) === true ||
        pulses?.schedule(state) === true ||
        reveal?.schedule(state) === true
          ? null
          : phasePlan(
              state,
              props.children.some(
                (item) =>
                  (item.kind === 'line' || item.kind === 'area') &&
                  item.props.loadingStyle === 'sweep',
              ),
            )

      if (plan !== null) {
        if (plan.exit !== undefined) {
          for (const [key, value] of Object.entries({
            from: plan.exit.from,
            mid: plan.exit.mid,
            grow: `${plan.exit.growMs}ms`,
            shrink: `${plan.exit.shrinkMs}ms`,
          })) {
            element.style.setProperty(`--bkm-x-${key}`, String(value))
          }

          element.dataset.bkmExit = ''
        }

        if (plan.onFrame) {
          frame = window.requestAnimationFrame(() => {
            observe.deadline(state.generation)
          })
        } else {
          timer = window.setTimeout(() => {
            observe.deadline(state.generation)
          }, plan.delay)
        }
      }

      if (state.phase === 'ready' && !state.revealReady) {
        revealTimer = window.setTimeout(
          () => {
            observe.revealed(state.generation)
          },
          Math.max(0, state.configuration.animationDuration),
        )
      }
    }
  }

  const updateFocus = (
    state: Interaction,
    data: ReadonlyArray<Row>,
    focusedIndex: number | null,
  ) => {
    bandActive = paintTimeSeriesFocus({
      element,
      state,
      data,
      focusedIndex,
      props,
      snapshot,
      overlay,
      band,
      bandActive,
    })
  }

  const update = (state: Interaction, data: ReadonlyArray<Row>, focusedIndex: number | null) => {
    current = state
    reveal?.update(state)
    sweeps.update(state)
    pulses?.update(state)
    latestData = data
    const flags = loadingFlags(state.phase)
    labelView.update(flags.chartLoading, state.phase === 'exiting')

    if (state.phase !== 'ready' || state.revealReady) {
      delete element.dataset.bkmWipeIn
    }

    reportPhase(state)
    paintTimeSeriesStatus(element, state, props.children, flags)
    beginGeneration(state)
    markers?.update(state, markerEpoch)
    candles?.update(state)
    scatter?.update(state)
    schedulePhase(state)
    updateFocus(state, data, focusedIndex)
  }

  const resource: CartesianResource<Row, SceneDatum> = {
    get fontMetricsChanged() {
      return props.renderContext === undefined ? pillFonts.changed : undefined
    },
    prepare: (state, data) => {
      current = state
      latestData = data
      sweeps.prepare(state)
      pulses?.prepare(state)
      reveal?.prepare(state)
    },
    configure: (next) => {
      // Configuration is rebound by Foldkit; draw owns measurement change detection.
      if (visualRoot === undefined) {
        replaceChartStyle(
          element,
          { ...bklitSurfaceStyle, ...props.style },
          { ...bklitSurfaceStyle, ...next.style },
        )

        if (next.style?.width === undefined) {
          element.style.setProperty(
            '--bkm-native-width',
            next.width === undefined ? '100%' : `${next.width}px`,
          )
        }

        if (next.style?.height === undefined) {
          element.classList.toggle('[height:var(--bkm-native-height)]', next.height !== undefined)
          if (next.height === undefined) element.style.removeProperty('--bkm-native-height')
          else element.style.setProperty('--bkm-native-height', `${next.height}px`)
        }
      }

      if (props.loadingLabel !== next.loadingLabel) {
        labelView = loadingLabel(next.loadingLabel ?? '')
        const replacement = labelView.element
        label.replaceWith(replacement)
        label = replacement
      }

      props = next
      publication.configure()
      tooltip = mergeTooltipCarriers(props.children)
    },
    draw,
    update,
    attach: (renderer, redrawHost) => {
      domain?.attach(redrawHost)
      releasePointer()
      releasePointer = pointerObservations(
        element,
        renderer,
        () => snapshot,
        () => current,
        observe,
        () => latestData,
      )
    },
    destroy: () => {
      releaseMarkers()
      cancelled = true
      publication.destroy()
      domain?.destroy()
      releasePointer()
      clear()
      overlay.destroy()
      sweeps.destroy()
      pulses?.destroy()
      reveal?.destroy()
      markers?.destroy()
      candles?.destroy()
      scatter?.destroy()
      band.destroy()
      gridMasks.draw()
      drawScatterPaint()
      element.removeEventListener('animationstart', animate)
      element.removeEventListener('animationiteration', animate)
      element.removeEventListener('animationend', animate)
      stylesheet.remove()
      releaseCssScope()
      bandSvg.remove()
      label.remove()
      legend.remove()

      for (const name of element.getAttributeNames()) {
        if (name.startsWith('data-bkm-')) {
          element.removeAttribute(name)
        }
      }

      for (const [name, value] of originalAttributes) {
        element.setAttribute(name, value)
      }

      if (visualRoot === undefined) {
        element.classList.toggle('relative', hadRelativeClass)
        element.classList.toggle('select-none', hadSelectionClass)
        element.classList.toggle('[width:var(--bkm-native-width)]', hadWidthClass)
        element.classList.toggle('[height:var(--bkm-native-height)]', hadHeightClass)
      }

      if (originalStyle === null) {
        element.removeAttribute('style')
      } else {
        element.setAttribute('style', originalStyle)
      }
    },
  }

  return domain === undefined
    ? resource
    : Object.assign(resource, { definition: domain.definition })
}
