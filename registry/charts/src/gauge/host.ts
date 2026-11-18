import { mountChartRenderer } from '@tanstack/charts/renderer'
import type { ChartRendererHost } from '@tanstack/charts'
import { gaugeLayout } from './host-layout'
import { gaugeOptions } from './options'
import type { GaugeNotchRow } from './notches'
import { createGaugeLabel } from './label'
import { createGaugeRenderer } from './notch-renderer'
import type { GaugeProps } from './props'

/** Owns only drawing inputs and the native renderer. No report data acquisition. */
export const mountGauge: (
  container: HTMLElement,
  initialProps: GaugeProps,
  uid: string,
) => GaugeHost = function mountGauge(
  container: HTMLElement,
  initialProps: GaugeProps,
  uid: string,
) {
  const gradientId = `${uid}-gauge-theme-active`
  const root = document.createElement('div')
  root.dataset.bkmChart = ''
  const chartBox = document.createElement('div')
  const chartWrapper = document.createElement('div')
  chartWrapper.className = 'ts-chart-host'
  const surface = document.createElement('div')
  surface.className = 'ts-chart-surface w-full h-full'
  chartWrapper.append(surface)
  chartBox.append(chartWrapper)
  let label = createGaugeLabel()
  let labelKind = 'none'
  let linearLayout: HTMLDivElement | undefined
  let linearTrack: HTMLDivElement | undefined
  let linearClip: HTMLDivElement | undefined
  const resources = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  resources.setAttribute('aria-hidden', 'true')
  resources.setAttribute('class', 'absolute w-0 h-0 overflow-hidden pointer-events-none')
  const defs = document.createElementNS(resources.namespaceURI, 'defs')
  const gradient = document.createElementNS(resources.namespaceURI, 'linearGradient')
  gradient.setAttribute('id', gradientId)
  gradient.setAttribute('x1', '0%')
  gradient.setAttribute('x2', '100%')
  gradient.setAttribute('y1', '0%')
  gradient.setAttribute('y2', '0%')

  for (const [offset, color] of [
    ['0%', 'var(--chart-1)'],
    ['100%', 'var(--chart-5)'],
  ]) {
    const stop = document.createElementNS(resources.namespaceURI, 'stop')

    if (offset !== undefined && color !== undefined) {
      stop.setAttribute('offset', offset)
      stop.setAttribute('stop-color', color)
    }

    gradient.append(stop)
  }

  defs.append(gradient)
  resources.append(defs)
  container.append(root)

  let reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let props = initialProps

  const renderer = createGaugeRenderer(() => ({
    props,
    reduced,
    scrub: props.orientation === 'linear' && props.geometryScrubbing === true,
  }))

  let chart: ChartRendererHost<GaugeNotchRow, number, number> | undefined

  let destroyed = false
  let layoutKey = ''
  const styles = new WeakMap<HTMLElement, string>()

  const writeStyle: (element: HTMLElement, css: string) => void = (
    element: HTMLElement,
    css: string,
  ) => {
    if (styles.get(element) === css) {
      return
    }

    styles.set(element, css)
    element.style.cssText = css
  }

  const rebuildLayout: (layoutInfo: ReturnType<typeof gaugeLayout>) => void = (
    layoutInfo: ReturnType<typeof gaugeLayout>,
  ) => {
    layoutKey = layoutInfo.nextLayout
    root.replaceChildren()
    linearLayout = undefined
    linearTrack = undefined
    linearClip = undefined

    if (layoutInfo.linear) {
      const layout = document.createElement('div')
      linearLayout = layout

      if (layoutInfo.hasLabel) {
        const track = document.createElement('div')
        linearTrack = track
        track.append(chartBox)

        if (layoutInfo.labelFirst) {
          layout.append(label.node, track)
        } else {
          layout.append(track, label.node)
        }
      } else {
        layout.append(chartBox)
      }

      if (props.width === undefined) {
        const clip = document.createElement('div')
        linearClip = clip
        clip.className = layoutInfo.linearClipClass
        const box = document.createElement('div')
        box.className = 'bk-gauge-clip-box'
        const inner = document.createElement('div')
        inner.className = 'bk-gauge-clip-inner'
        inner.append(layout)
        box.append(inner)
        clip.append(box)
        root.append(clip)
      } else {
        root.append(layout)
      }
    } else {
      root.append(chartBox)
    }
  }

  const updateLabelLayout: (layout: ReturnType<typeof gaugeLayout>) => void = (
    layout: ReturnType<typeof gaugeLayout>,
  ) => {
    if (layout.linear) {
      if (linearLayout !== undefined) {
        linearLayout.className = layout.linearLayoutClass
      }

      if (linearTrack !== undefined) {
        linearTrack.className = layout.linearTrackClass
      }

      if (linearClip !== undefined) {
        linearClip.className = layout.linearClipClass
        linearClip.style.cssText = layout.linearClipStyle
      }

      if (layout.hasLabel) {
        label.node.className = layout.labelClass
      }
    } else if (layout.hasLabel) {
      if (label.node.parentElement !== chartBox) {
        chartBox.append(label.node)
      }
    } else {
      label.node.remove()
    }
  }

  const apply: () => void = () => {
    if (destroyed) {
      return
    }

    const layout = gaugeLayout(props)
    const { linear, hasLabel, nextLayout, nextLabelKind } = layout
    const scrub = linear && props.geometryScrubbing === true

    root.className = layout.rootClass
    writeStyle(root, layout.rootStyle)
    chartBox.className = layout.boxClass
    writeStyle(chartBox, layout.boxStyle)
    chartWrapper.className = layout.wrapperClass
    writeStyle(chartWrapper, layout.wrapperStyle)

    const rebuilt = nextLayout !== layoutKey

    const remount = layoutKey !== '' && rebuilt

    if (remount) {
      chart?.destroy()
      chart = undefined
    }

    if (nextLabelKind !== labelKind || remount) {
      label.destroy()
      label = createGaugeLabel()
      labelKind = nextLabelKind
    }

    if (hasLabel) {
      label.update(props, !linear)
    }

    if (rebuilt) {
      rebuildLayout(layout)
    }

    updateLabelLayout(layout)

    if (
      props.useGradient === true &&
      props.activeGradient === undefined &&
      (props.activeFill === undefined || props.activeFill === '')
    ) {
      chartBox.append(resources)
    } else {
      resources.remove()
    }

    const options = { ...gaugeOptions(props, uid, !scrub), renderer }

    if (chart === undefined) {
      chart = mountChartRenderer(surface, options)
    } else {
      chart.update(options)
    }

    if (hasLabel) {
      label.commit()
    }
  }

  apply()

  return {
    update(next) {
      if ((next.orientation === 'linear') !== (props.orientation === 'linear')) {
        reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      }

      props = next
      apply()
    },
    destroy() {
      if (destroyed) {
        return
      }

      destroyed = true
      label.destroy()
      chart?.destroy()

      for (const animation of root.getAnimations({ subtree: true })) {
        animation.cancel()
      }

      root.remove()
    },
  }
}

export interface GaugeHost {
  readonly update: (props: GaugeProps) => void
  readonly destroy: () => void
}
