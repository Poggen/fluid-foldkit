import type { CartesianLayer } from './layers'
import type { Interaction, loadingFlags } from './state'
import { propsFor } from './table'

export function paintTimeSeriesStatus<Row>(
  element: HTMLElement,
  state: Interaction,
  children: ReadonlyArray<CartesianLayer<Row>>,
  flags: ReturnType<typeof loadingFlags>,
): void {
  if (flags.chartLoading) {
    element.dataset.bkmStatus = 'loading'
  } else {
    delete element.dataset.bkmStatus
  }

  const [grid] = propsFor(children, 'grid')

  if (flags.chartLoading && grid?.shimmer === true) {
    element.dataset.bkmLoadingShimmer = ''
  } else {
    delete element.dataset.bkmLoadingShimmer
  }

  element.style.setProperty(
    '--bkm-loading-shimmer-duration',
    `${2.48 / Math.max(0.1, grid?.shimmerSpeed ?? 1)}s`,
  )

  if (state.revealReady && state.phase === 'ready') {
    element.dataset.bkmReady = ''
  } else {
    delete element.dataset.bkmReady
  }
}
