import type { SceneNode } from '@tanstack/charts'
import type { FunnelMarkConfig, FunnelStageInput, FunnelGeometry, Frame } from './marks'
import { fontContext, textWidth } from './private/text-width'

const SSR_WIDTH_RATIO = 0.58

type LabelAnchor = 'start' | 'middle' | 'end'

const LABEL_FONT = {
  name: { size: 12, weight: 500 },
  pct: { size: 12, weight: 700 },
  value: { size: 14, weight: 600 },
}

// bklit: ring half-extent as a share of the chart cross axis.
const VALUE_LINE = 20

const SMALL_LINE = 16

const PILL_PAD_X = 12

const PILL_PAD_Y = 4

const GROUP_GAP = 6

const GROUP_PAD = 0.08

const SPREAD_BAND = 0.16

// The painted inset TanStack's rect mark gives a band (rect `inset` default).
interface FontMetrics {
  /** Rounded font ascent / descent: what an HTML line box centres (the baseline sits (ascent - descent) / 2 below the line centre). */
  readonly ascent: number
  readonly descent: number
  /** SVG `dominant-baseline: middle` puts the baseline half an x-height below the y attribute. */
  readonly xHeight: number
}

const fontMetrics = (
  fontSize: number,
  fontWeight: number,
  fontFamily: string,
  measure: boolean,
): FontMetrics => {
  const metrics = measure
    ? fontContext(fontSize, fontWeight, fontFamily)?.measureText('x')
    : undefined

  return metrics
    ? {
        ascent: metrics.fontBoundingBoxAscent,
        descent: metrics.fontBoundingBoxDescent,
        xHeight: metrics.actualBoundingBoxAscent,
      }
    : { ascent: fontSize, descent: fontSize / 3, xHeight: fontSize * 0.53 }
}

interface LabelItem {
  readonly kind: 'value' | 'pct' | 'name'
  readonly text: string
  readonly width: number
  readonly height: number
}

interface Placed {
  readonly item: LabelItem
  readonly anchor: LabelAnchor
  readonly px: number
  readonly py: number
}

/** A stage cell in px: its origin, size and centre. */
interface LabelBox {
  readonly cxPx: number
  readonly cyPx: number
  readonly cellPxStart: number
  readonly cellPyStart: number
  readonly cellW: number
  readonly cellH: number
}

type Put = (item: LabelItem, px: number, py: number, anchor: LabelAnchor) => void

const labelItems = (
  config: FunnelMarkConfig,
  fontFamily: string,
  stage: FunnelStageInput,
  pct: number,
): Array<LabelItem> => {
  const items: Array<LabelItem> = []

  const width = (t: string, size: number, weight: number): number =>
    config.measureText
      ? textWidth(t, size, weight, fontFamily, SSR_WIDTH_RATIO)
      : t.length * size * SSR_WIDTH_RATIO

  if (config.showValues) {
    const t = stage.displayValue ?? config.formatValue(stage.value)
    items.push({ height: VALUE_LINE, kind: 'value', text: t, width: width(t, 14, 600) })
  }

  if (config.showPercentage) {
    const t = config.formatPercentage(pct)
    items.push({
      height: SMALL_LINE + PILL_PAD_Y * 2,
      kind: 'pct',
      text: t,
      width: width(t, 12, 700) + PILL_PAD_X * 2,
    })
  }

  if (config.showLabels) {
    items.push({
      height: SMALL_LINE,
      kind: 'name',
      text: stage.label,
      width: width(stage.label, 12, 500),
    })
  }

  return items
}

const findItem = (
  items: ReadonlyArray<LabelItem>,
  kind: LabelItem['kind'],
): LabelItem | undefined => items.find((it) => it.kind === kind)

const placeSpread = (
  items: ReadonlyArray<LabelItem>,
  box: LabelBox,
  horizontal: boolean,
  put: Put,
): void => {
  const value = findItem(items, 'value')
  const pctItem = findItem(items, 'pct')
  const name = findItem(items, 'name')
  const { cxPx, cyPx, cellPxStart, cellPyStart, cellW, cellH } = box

  if (horizontal) {
    if (value) {
      put(value, cxPx, cellPyStart + cellH * SPREAD_BAND - 4 - VALUE_LINE / 2, 'middle')
    }

    if (pctItem) {
      put(pctItem, cxPx, cyPx, 'middle')
    }

    if (name) {
      put(name, cxPx, cellPyStart + cellH * (1 - SPREAD_BAND) + 4 + SMALL_LINE / 2, 'middle')
    }
  } else {
    if (value) {
      put(value, cellPxStart + cellW * SPREAD_BAND - 8, cyPx, 'end')
    }

    if (pctItem) {
      put(pctItem, cxPx, cyPx, 'middle')
    }

    if (name) {
      put(name, cellPxStart + cellW * (1 - SPREAD_BAND) + 8, cyPx, 'start')
    }
  }
}

// bklit pads the group by 8% of the cell WIDTH on both axes (CSS percentage padding is width-relative).
const groupOffset = (
  align: FunnelMarkConfig['labelAlign'],
  size: number,
  total: number,
  cellW: number,
): number => {
  const pad = cellW * GROUP_PAD

  if (align === 'start') {
    return pad
  }

  if (align === 'end') {
    return total - pad - size
  }

  return (total - size) / 2
}

const alignedLeft = (
  align: FunnelMarkConfig['labelAlign'],
  left: number,
  groupWidth: number,
  width: number,
): number => {
  if (align === 'start') {
    return left
  }

  return align === 'end' ? left + groupWidth - width : left + (groupWidth - width) / 2
}

// Grouped: a tight stack (gap-1.5) placed within the cell by labelAlign.
const placeGrouped = (
  items: ReadonlyArray<LabelItem>,
  box: LabelBox,
  config: Pick<FunnelMarkConfig, 'horizontal' | 'labelAlign' | 'labelOrientation'>,
  put: Put,
): void => {
  const { horizontal, labelAlign } = config
  const { cxPx, cyPx, cellPxStart, cellPyStart, cellW, cellH } = box

  const stackVertical =
    (config.labelOrientation ?? (horizontal ? 'vertical' : 'horizontal')) === 'vertical'

  const gapTotal = GROUP_GAP * Math.max(0, items.length - 1)

  const gw = stackVertical
    ? Math.max(0, ...items.map((it) => it.width))
    : items.reduce((sum, it) => sum + it.width, 0) + gapTotal

  const gh = stackVertical
    ? items.reduce((sum, it) => sum + it.height, 0) + gapTotal
    : Math.max(0, ...items.map((it) => it.height))

  // bklit: horizontal funnels place the group vertically; vertical funnels place it horizontally.
  const left = horizontal ? cxPx - gw / 2 : cellPxStart + groupOffset(labelAlign, gw, cellW, cellW)
  const top = horizontal ? cellPyStart + groupOffset(labelAlign, gh, cellH, cellW) : cyPx - gh / 2
  const itemAlign = horizontal ? 'center' : labelAlign
  let cursor = stackVertical ? top : left

  for (const item of items) {
    if (stackVertical) {
      put(
        item,
        alignedLeft(itemAlign, left, gw, item.width) + item.width / 2,
        cursor + item.height / 2,
        'middle',
      )
      cursor += item.height + GROUP_GAP
    } else {
      put(item, cursor + item.width / 2, top + (gh - item.height) / 2 + item.height / 2, 'middle')
      cursor += item.width + GROUP_GAP
    }
  }
}

/** Plot geometry in px from the plot's top-left, shared by rings, grid and labels. */
// Spread/grouped label nodes of one stage: the pill, then value, percentage and name text, in one group that fades as a layer (bklit's label overlay).
const labelNodes = (
  config: FunnelMarkConfig,
  geo: FunnelGeometry,
  frame: Frame,
  fonts: Readonly<Record<LabelItem['kind'], FontMetrics>>,
  index: number,
  items: ReadonlyArray<LabelItem>,
): Array<SceneNode> => {
  const { horizontal } = config
  const cellPxStart = horizontal ? geo.cellStart(index) : 0
  const cellW = horizontal ? geo.cellPx : geo.W
  const cellPyStart = horizontal ? 0 : geo.cellStart(index)
  const cellH = horizontal ? geo.H : geo.cellPx

  const box: LabelBox = {
    cellH,
    cellPxStart,
    cellPyStart,
    cellW,
    cxPx: cellPxStart + cellW / 2,
    cyPx: cellPyStart + cellH / 2,
  }

  const placed: Array<Placed> = []

  const put: Put = (item, px, py, anchor) => {
    placed.push({ anchor, item, px, py })
  }

  if (config.labelLayout === 'spread') {
    placeSpread(items, box, horizontal, put)
  } else {
    placeGrouped(items, box, config, put)
  }

  // HTML line boxes put the baseline (ascent - descent) / 2 below the line centre and paint it on a whole pixel; SVG text is placed by
  // its x-height centre, so each label's y is that rounded baseline minus half the x-height.
  const textY = (kind: LabelItem['kind'], centre: number): number => {
    const metrics = fonts[kind]

    return Math.round(centre + (metrics.ascent - metrics.descent) / 2) - metrics.xHeight / 2
  }

  const FILL: Record<LabelItem['kind'], string> = {
    name: 'var(--bkm-muted-foreground)',
    pct: 'var(--bkm-background)',
    value: 'var(--bkm-foreground)',
  }

  const nodes: Array<SceneNode> = []
  const pill = placed.find((entry) => entry.item.kind === 'pct')

  if (pill) {
    const { item, px, py } = pill
    nodes.push({
      className: 'bkm-pill',
      height: Math.round(py + item.height / 2) - Math.round(py - item.height / 2),
      key: `funnel-pill-${index}`,
      kind: 'rect',
      radius: (PILL_PAD_Y * 2 + SMALL_LINE) / 2,
      style: { fill: 'var(--bkm-foreground)' },
      width: Math.round(px + item.width / 2) - Math.round(px - item.width / 2),
      x: frame.x + Math.round(px - item.width / 2),
      y: frame.y + Math.round(py - item.height / 2),
    })
  }

  for (const kind of ['value', 'pct', 'name'] satisfies ReadonlyArray<LabelItem['kind']>) {
    const entry = placed.find((candidate) => candidate.item.kind === kind)

    if (entry) {
      nodes.push({
        anchor: entry.anchor,
        baseline: 'middle',
        fontSize: LABEL_FONT[kind].size,
        fontWeight: LABEL_FONT[kind].weight,
        key: `funnel-${kind}-${index}`,
        kind: 'label',
        style: { fill: FILL[kind] },
        text: entry.item.text,
        x: frame.x + entry.px,
        y: frame.y + textY(kind, entry.py),
      })
    }
  }

  return nodes
}

export { LABEL_FONT, fontMetrics, labelItems, labelNodes }
