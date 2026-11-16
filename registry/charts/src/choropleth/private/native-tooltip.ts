import { nativeTooltip as sourceTooltip } from '../../sankey/private/native-tooltip'

/** Choropleth anchors are projected centroids, not integer MouseEvent coordinates. */
export const nativeTooltip = (id: string) =>
  sourceTooltip(id, false, (point) => `feature:${point.datumIndex}`)
