import { textWidth } from './private/text-width'
import type { SankeyNodeInput, LabelOrientation } from './marks'

const NAME_FONT_SIZE = 13

const VALUE_FONT_SIZE = 11

const LABEL_OFFSET = 12

const VALUE_LABEL_GAP = 16

const VALUE_LABEL_OPACITY = 0.6

const BASELINE_RESIDUAL_EM = 0.0844

const ROTATE_CW = 90

interface LabelRow {
  readonly key: number
  readonly name: string
  readonly value: string
  readonly anchor: 'start' | 'middle' | 'end'
  readonly rotate: number
  readonly nameX: number
  readonly nameY: number
  readonly valueX: number
  readonly valueY: number
}

interface NodeLayoutRow {
  readonly value: number
  readonly key: number
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
  readonly data: SankeyNodeInput
}

interface NodeRowShape extends NodeLayoutRow {
  readonly labelBoxes: ReadonlyArray<HitBox>
  readonly radius: number
}

const intFmt = /* @__PURE__ */ new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

const placeLabels = (
  nodes: ReadonlyArray<NodeLayoutRow>,
  chart: { readonly x: number; readonly width: number },
  orientation: LabelOrientation,
  showValue: boolean,
  formatValue: (value: number) => string = (value) => `${intFmt.format(value)} sessions`,
): Array<LabelRow> =>
  nodes.map((node) => {
    const nodeW = Math.max(0, node.x1 - node.x0)
    const centerY = node.y0 + (node.y1 - node.y0) / 2
    const isLeft = node.x0 - chart.x < chart.width / 2
    const edge = isLeft ? node.x0 - LABEL_OFFSET : node.x0 + nodeW + LABEL_OFFSET
    const base = { key: node.key, name: node.data.name, value: formatValue(node.value) }

    if (orientation === 'vertical') {
      const half = VALUE_LABEL_GAP / 2
      const signedHalf = isLeft ? half : -half
      const shift = showValue ? signedHalf : 0

      return {
        ...base,
        anchor: 'middle',
        nameX: edge + shift,
        nameY: centerY,
        rotate: isLeft ? -ROTATE_CW : ROTATE_CW,
        valueX: edge + (isLeft ? -half : half),
        valueY: centerY,
      }
    }

    return {
      ...base,
      anchor: isLeft ? 'end' : 'start',
      nameX: edge,
      nameY: centerY,
      rotate: 0,
      valueX: edge,
      valueY: centerY + VALUE_LABEL_GAP,
    }
  })

interface BaselineShift {
  readonly dx: number
  readonly dy: number
}

const baselineShift = (fontSize: number, rotate: number): BaselineShift => {
  const shift = fontSize * BASELINE_RESIDUAL_EM

  if (rotate === -ROTATE_CW) {
    return { dx: shift, dy: 0 }
  }

  if (rotate === ROTATE_CW) {
    return { dx: -shift, dy: 0 }
  }

  return { dx: 0, dy: shift }
}

// bklit hovers a node from its whole <g>, labels included; the focus strategy reads these boxes so a label hover resolves to its node.
interface HitBox {
  readonly x0: number
  readonly x1: number
  readonly y0: number
  readonly y1: number
}

const LINE_BOX = 1.2

const SSR_WIDTH_RATIO = 0.55

const leftEdge = (anchor: LabelRow['anchor'], x: number, length: number): number => {
  if (anchor === 'end') {
    return x - length
  }

  return anchor === 'middle' ? x - length / 2 : x
}

type SankeyTextWidth = typeof textWidth

const labelHitBoxes = (
  label: LabelRow,
  showValue: boolean,
  family: string,
  measureTextWidth: SankeyTextWidth = textWidth,
): ReadonlyArray<HitBox> => {
  const one = (
    content: string,
    fontSize: number,
    fontWeight: number,
    x: number,
    y: number,
  ): HitBox => {
    const length = measureTextWidth(content, fontSize, fontWeight, family, SSR_WIDTH_RATIO)
    const thick = fontSize * LINE_BOX

    if (label.rotate !== 0) {
      return { x0: x - thick / 2, x1: x + thick / 2, y0: y - length / 2, y1: y + length / 2 }
    }

    const left = leftEdge(label.anchor, x, length)

    return { x0: left, x1: left + length, y0: y - thick / 2, y1: y + thick / 2 }
  }

  const boxes = [one(label.name, NAME_FONT_SIZE, 500, label.nameX, label.nameY)]

  if (showValue) {
    boxes.push(one(label.value, VALUE_FONT_SIZE, 400, label.valueX, label.valueY))
  }

  return boxes
}

// bklit's inner width goes negative on narrow hosts and sankeyDiagram refuses an extent narrower than its node: the native layout gives
// y, heights and layers at a 1px node, and columns use d3-sankey's x0 = left + layer * (inner - nodeWidth) / (columns - 1).

export {
  NAME_FONT_SIZE,
  VALUE_FONT_SIZE,
  VALUE_LABEL_OPACITY,
  placeLabels,
  labelHitBoxes,
  baselineShift,
  intFmt,
}
export type { LabelRow, NodeLayoutRow, NodeRowShape, SankeyTextWidth }
