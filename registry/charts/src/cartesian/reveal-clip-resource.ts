import { animateVisualElement, motionValue, SVGVisualElement } from 'motion-dom'
import type { TargetAndTransition, MotionNodeOptions, MotionValue } from 'motion-dom'
import type { CartesianSnapshot } from './definition'
import type { NativeObservation } from './native-resource'
import type { Interaction } from './state'
import type { TimeSeriesProps } from './root-options'
import { keyAttr } from './build-state'
import { keyStarts } from '../kit/renderer-dom'
import { revealTransition } from './reveal-transition'

const NS = 'http://www.w3.org/2000/svg'

function revealMode(state: Interaction, eligible: boolean) {
  if (eligible && state.phase === 'concealing') {
    return 'conceal'
  }

  return eligible && state.phase === 'ready' && !state.revealReady ? 'reveal' : 'static'
}

function contentVisibility<Row>(
  scope: string,
  snapshot: CartesianSnapshot<Row>,
  state: Interaction,
): string {
  if (state.phase !== 'swap' && state.phase !== 'tween' && state.phase !== 'tweenLoading') {
    return ''
  }

  const lineMarkers = snapshot.series
    .filter((series) => series.kind === 'line')
    .map((series) => `${scope} .bkm-wipe-o:has(g${keyStarts(`${keyAttr(series.id)}:marker`)})`)
    .join(',')

  return `${scope} .bkm-wipe-o{--bkm-reveal-visibility:hidden}${lineMarkers.length > 0 ? `${lineMarkers}{--bkm-reveal-visibility:visible}` : ''}`
}

/** One Source-shaped clip owns every series' reveal epoch; markers retain their separate fade/stagger. */
export function revealClipResource<Row>(
  element: HTMLElement,
  id: string,
  props: () => TimeSeriesProps<Row>,
  observe: NativeObservation,
) {
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.setAttribute('aria-hidden', 'true')
  svg.classList.add('absolute')
  const clip = document.createElementNS(NS, 'clipPath')
  clip.id = `${id}-series-reveal`
  clip.setAttribute('clipPathUnits', 'userSpaceOnUse')
  const rect = document.createElementNS(NS, 'rect')
  const width = motionValue(0)
  const x = motionValue(0)
  let activeDefinition: TargetAndTransition | undefined
  let concealGeneration: number | undefined
  let disposed = false

  const motionProps: MotionNodeOptions & {
    readonly style: { readonly width: MotionValue<number>; readonly x: MotionValue<number> }
  } = {
    style: { width, x },
    onAnimationComplete: (definition) => {
      if (!disposed && definition === activeDefinition && concealGeneration !== undefined) {
        observe.deadline(concealGeneration)
      }
    },
  }

  const visual = new SVGVisualElement({
    visualState: {
      latestValues: { width: 0, x: 0 },
      renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {}, attrs: {} },
    },
    props: motionProps,
    presenceContext: null,
    reducedMotionConfig: 'never',
  })

  clip.append(rect)
  svg.append(clip)
  const style = document.createElement('style')
  const scope = `[data-bkm-physical-reveal="${CSS.escape(id)}"]`

  const baseCss = `${scope}[data-bkm-reveal-clip] .bkm-wipe-o{--bkm-reveal-clip:url(#${CSS.escape(clip.id)})}`

  element.dataset.bkmPhysicalReveal = id
  element.append(svg, style)
  visual.mount(rect)
  visual.render()

  let state: Interaction | undefined
  let snapshot: CartesianSnapshot<Row> | undefined
  let key = ''
  let epoch = -1
  let previousMode = 'static'
  let pending = false

  const canAnimate = (next: Interaction) =>
    snapshot !== undefined &&
    snapshot.rows.length > 1 &&
    snapshot.innerWidth > 0 &&
    next.configuration.animationDuration > 0

  const stop = () => {
    activeDefinition = undefined
    concealGeneration = undefined
    width.stop()
    x.stop()
  }

  const draw = () => {
    if (state === undefined || snapshot === undefined) {
      return
    }

    const { innerWidth, innerHeight, margin } = snapshot
    rect.setAttribute('height', String(innerHeight + 20))
    rect.setAttribute('y', '0')
    clip.setAttribute('transform', `translate(${margin.left} ${margin.top})`)

    const eligible = canAnimate(state)

    if (eligible) {
      element.dataset.bkmRevealClip = ''
    } else {
      delete element.dataset.bkmRevealClip
    }

    const css = baseCss + contentVisibility(scope, snapshot, state)

    if (style.textContent !== css) {
      style.textContent = css
    }

    const mode = revealMode(state, eligible)

    const next = JSON.stringify([state.generation, mode, innerWidth])

    if (next === key) {
      return
    }

    const newEpoch = epoch !== state.generation || previousMode !== mode
    epoch = state.generation
    previousMode = mode
    key = next
    stop()
    const { generation } = state

    if (mode === 'static') {
      width.set(innerWidth)
      x.set(0)
      visual.render()

      return
    }

    if (newEpoch) {
      width.set(mode === 'conceal' ? innerWidth : 0)
      x.set(0)
      visual.render()
    }

    const transition = revealTransition(
      props().enterTransition,
      state.configuration.animationDuration,
    )

    const definition: TargetAndTransition =
      mode === 'conceal'
        ? { width: 0, x: innerWidth, transition }
        : { width: innerWidth, transition }

    activeDefinition = definition
    concealGeneration = mode === 'conceal' ? generation : undefined
    void animateVisualElement(visual, definition)
  }

  return {
    prepare: (next: Interaction) => {
      state = next
    },
    draw: (next: CartesianSnapshot<Row>) => {
      snapshot = next

      if (!pending) {
        pending = true
        queueMicrotask(() => {
          pending = false

          if (!disposed) {
            draw()
          }
        })
      }
    },
    update: (next: Interaction) => {
      state = next
      draw()
    },
    schedule: (next: Interaction) => next.phase === 'concealing' && canAnimate(next),
    destroy: () => {
      disposed = true
      stop()
      visual.unmount()
      width.destroy()
      x.destroy()
      svg.remove()
      style.remove()
      delete element.dataset.bkmPhysicalReveal
      delete element.dataset.bkmRevealClip
    },
  }
}
