import type { BarProps } from './options'
// Pure geometry shared by the bar-family custom marks (squares, track, depth).
// Ports of bklit's bar-squares-layout and bar-depth geometry helpers.

/** @internal */
export interface SquareColumnLayout {
  /** Number of squares in the column. */
  count: number
  /** Top offsets (relative to the column top), bottom square first. */
  positions: Array<number>
  /** Quantized column height in pixels. */
  columnHeight: number
  squareSize: number
  /** Effective gap between squares (fit mode redistributes it). */
  gap: number
}

export interface SquareColumnInput {
  /** Raw bar length in pixels (baseline minus value). */
  barLengthPx: number
  /** Square width and height, typically the bar width. */
  squareSize: number
  /** Gap between stacked squares in pixels. */
  gap: number
  /** Redistribute the gap so the column height matches `barLengthPx` exactly. */
  fit?: boolean
}

/**
 * Quantize a bar length into a stack of square cells.
 * @internal
 */
export function computeSquareColumn({
  barLengthPx,
  squareSize,
  gap,
  fit = false,
}: SquareColumnInput): SquareColumnLayout {
  if (barLengthPx <= 0 || squareSize <= 0) {
    return { count: 0, columnHeight: 0, positions: [], squareSize, gap }
  }

  const positions: Array<number> = []

  if (fit) {
    const count = Math.max(1, Math.floor((barLengthPx + gap) / (squareSize + gap)))
    const effective = count > 1 ? Math.max(0, (barLengthPx - count * squareSize) / (count - 1)) : 0
    const step = squareSize + effective

    for (let i = 0; i < count; i += 1) {
      positions.push(barLengthPx - squareSize - i * step)
    }

    return { count, columnHeight: barLengthPx, positions, squareSize, gap: effective }
  }

  const step = squareSize + gap
  const count = Math.max(1, Math.round(barLengthPx / step))
  const columnHeight = count * squareSize + Math.max(0, count - 1) * gap

  for (let i = 0; i < count; i += 1) {
    positions.push(columnHeight - squareSize - i * step)
  }

  return { count, columnHeight, positions, squareSize, gap }
}

/** One layout feeds the square scene and the column-spanning SVG paint definitions. */
export function squareColumnFrame(input: {
  readonly centre: number
  readonly bandwidth: number
  readonly baseline: number
  readonly top: number
  readonly value: number
  readonly slot: number
  readonly slots: number
  readonly groupGap: number
  readonly squareGap: number
  readonly fit: boolean
}) {
  if (
    !input.bandwidth ||
    !Number.isFinite(input.centre) ||
    !Number.isFinite(input.top) ||
    input.value <= 0
  ) {
    return null
  }

  const gap = input.slots > 1 ? input.groupGap : 0
  const size = Math.max(0, (input.bandwidth - gap * (input.slots - 1)) / input.slots)

  const column = computeSquareColumn({
    barLengthPx: input.baseline - input.top,
    squareSize: size,
    gap: input.squareGap,
    fit: input.fit,
  })

  return {
    x: input.centre - input.bandwidth / 2 + input.slot * (size + gap),
    size,
    baseline: input.baseline,
    columnTop: input.baseline - column.columnHeight,
    column,
  }
}

/**
 * Y centre of the topmost square in a vertical column.
 * @internal
 */
export function topSquareCenterY({
  baselineY,
  ...input
}: SquareColumnInput & { baselineY: number }): number {
  const { count, squareSize, columnHeight } = computeSquareColumn(input)

  return count === 0 ? baselineY : baselineY - columnHeight + squareSize / 2
}

// --- 3D depth ---------------------------------------------------------

export const DEFAULT_GROUND_SHADOW = 0.26

export const GLASS_TIP_OPACITY = 0.2

/** Side-face depth is capped below the gap between neighbouring bars. */
function barDepthMaxDepth(step: number, bandWidth: number): number {
  const gap = Math.max(0, step - bandWidth)

  return Math.min(bandWidth * 0.22, Math.max(0, gap - 1), 7)
}

/** Depth grows with distance from the chart centre; the lid rises with it (bklit bar-depth-geometry.ts). */
function barDepthAndRise(
  absOffset: number,
  naturalHeight: number,
  maxDepth: number,
): Pick<DepthEntry, 'depth' | 'perspectiveRise'> {
  const offset = Math.min(1, Math.max(0, absOffset))
  const capped = Math.min(maxDepth, Math.max(0, naturalHeight))
  const depth = offset * capped

  return { depth, perspectiveRise: depth * 0.45 }
}

export interface DepthEntry {
  readonly index: number
  readonly label: string
  readonly bandX: number
  readonly bandWidth: number
  readonly baselineY: number
  readonly topY: number
  readonly bottomY: number
  readonly barHeight: number
  readonly naturalHeight: number
  readonly topYTrim: number
  readonly depth: number
  readonly perspectiveRise: number
  readonly isNegative: boolean
  readonly isRightOfCenter: boolean
}

export interface DepthInput {
  readonly index: number
  readonly label: string
  readonly value: number
  readonly bandX: number
  readonly bandWidth: number
  readonly step: number
  readonly innerWidth: number
  readonly plotLeft: number
  readonly baselineY: number
  readonly valueY: number
  readonly minBarHeight: number
  readonly topSegmentFraction?: number
}

export function depthEntry(input: DepthInput): DepthEntry | undefined {
  const { value, bandX, bandWidth, step, innerWidth, plotLeft, baselineY, valueY, minBarHeight } =
    input

  const isNegative = value < 0
  const rawHeight = Math.abs(baselineY - valueY)
  const naturalHeight = isNegative ? rawHeight : Math.max(rawHeight, minBarHeight)

  if (Number.isNaN(naturalHeight) || naturalHeight <= 0) {
    return undefined
  }

  const isFloored = !isNegative && rawHeight < naturalHeight
  const maxDepth = barDepthMaxDepth(step, bandWidth)
  const centerX = plotLeft + innerWidth / 2
  const cx = bandX + bandWidth / 2
  const offset = innerWidth > 0 ? (cx - centerX) / (innerWidth / 2) : 0

  const { depth, perspectiveRise: rawRise } = barDepthAndRise(
    Math.min(1, Math.abs(offset)),
    naturalHeight,
    maxDepth,
  )

  const perspectiveRise = isNegative ? 0 : rawRise

  const clampRef =
    input.topSegmentFraction === undefined
      ? naturalHeight
      : input.topSegmentFraction * naturalHeight

  const trim =
    naturalHeight > 0 && !isNegative && !isFloored
      ? Math.min(perspectiveRise, Math.max(0, clampRef - 1))
      : 0

  const topY = isNegative ? baselineY : baselineY - naturalHeight + trim
  const bottomY = isNegative ? baselineY + naturalHeight : baselineY

  return {
    index: input.index,
    label: input.label,
    bandX,
    bandWidth,
    baselineY,
    topY,
    bottomY,
    barHeight: bottomY - topY,
    naturalHeight,
    topYTrim: trim,
    depth,
    perspectiveRise,
    isNegative,
    isRightOfCenter: offset > 0,
  }
}

type Pt = readonly [number, number]

/** Side parallelogram between two y spans (front edge at the bar, back edge shifted by depth / rise). */
export function sidePoints(e: DepthEntry, y1: number, y2: number): Array<Pt> {
  const { bandX, bandWidth, depth, perspectiveRise: r, isRightOfCenter } = e

  if (isRightOfCenter) {
    return [
      [bandX, y1],
      [bandX - depth, y1 - r],
      [bandX - depth, y2 - r],
      [bandX, y2],
    ]
  }

  return [
    [bandX + bandWidth, y1],
    [bandX + bandWidth + depth, y1 - r],
    [bandX + bandWidth + depth, y2 - r],
    [bandX + bandWidth, y2],
  ]
}

export function lidPoints(e: DepthEntry): Array<Pt> {
  const { bandX, bandWidth, depth, perspectiveRise: r, topY, isRightOfCenter } = e

  if (isRightOfCenter) {
    return [
      [bandX, topY],
      [bandX + bandWidth, topY],
      [bandX + bandWidth - depth, topY - r],
      [bandX - depth, topY - r],
    ]
  }

  return [
    [bandX, topY],
    [bandX + bandWidth, topY],
    [bandX + bandWidth + depth, topY - r],
    [bandX + depth, topY - r],
  ]
}

export interface BarFrameInput {
  readonly value: number
  readonly offset: number
  readonly index: number
  readonly count: number
  readonly bandStart: number
  readonly bandwidth: number
  readonly step: number
  readonly innerLeft: number
  readonly innerTop: number
  readonly innerWidth: number
  readonly innerHeight: number
  readonly horizontal: boolean
  readonly stacked: boolean
  readonly scale: (value: number) => number
  readonly options: Pick<
    BarProps,
    'groupGap' | 'stackGap' | 'minBarHeight' | 'perspective' | 'lineCap'
  >
}

/** Source front-face policy; the caller alone owns scene admission and entrance Motion. */
export function projectBarFrame(input: BarFrameInput) {
  const { value, offset, index, count, scale, horizontal, stacked, options } = input
  const groupGap = count > 1 ? (options.groupGap ?? 4) : 0
  const thickness = !input.bandwidth
    ? 0
    : stacked
      ? input.bandwidth
      : (input.bandwidth - groupGap * (count - 1)) / count
  const last = index === count - 1
  const stackGap = options.stackGap ?? 0
  const zero = scale(0)
  let x: number
  let y: number
  let width: number
  let height: number
  if (horizontal) {
    const start = scale(stacked ? offset : 0)
    const end = scale((stacked ? offset : 0) + value)
    x = Math.min(start, end) + (stacked ? index * stackGap : 0)
    width = Math.abs(end - start)
    if (stacked && !last && stackGap > 0) width = Math.max(0, width - stackGap)
    y = input.bandStart + (stacked ? 0 : index * (thickness + groupGap))
    height = thickness
  } else {
    x = input.bandStart + (stacked ? 0 : index * (thickness + groupGap))
    width = thickness
    height = input.innerTop + input.innerHeight - scale(value)
    y = stacked ? scale(offset) - height - index * stackGap : scale(value)
    if (stacked && !last && stackGap > 0) height = Math.max(0, height - stackGap)
    let floored = false
    const minimum = options.minBarHeight ?? 0
    if (!stacked && minimum > 0 && value >= 0 && height < minimum) {
      height = minimum
      y = zero - minimum
      floored = true
    }
    if (options.perspective === true && value > 0 && !floored && (!stacked || last)) {
      const center = input.innerLeft + input.innerWidth / 2
      const categoryCenter = input.bandStart + input.bandwidth / 2
      const distance =
        input.innerWidth > 0
          ? Math.min(1, Math.abs((categoryCenter - center) / (input.innerWidth / 2)))
          : 0
      const rise = barDepthAndRise(
        distance,
        Math.abs(zero - y),
        barDepthMaxDepth(input.step, input.bandwidth),
      ).perspectiveRise
      const trim = Math.min(rise, Math.max(0, height - 1))
      y += trim
      height -= trim
    }
  }
  let radius = 0
  if (options.perspective !== true && (!stacked || stackGap > 0 || last)) {
    if (typeof options.lineCap === 'number') radius = options.lineCap
    else if ((options.lineCap ?? 'round') === 'round') radius = Math.min(thickness / 2, 8)
  }
  return {
    x,
    y,
    width,
    height,
    radius,
    painted:
      Number.isFinite(x) &&
      Number.isFinite(y) &&
      Number.isFinite(width) &&
      Number.isFinite(height) &&
      width > 0 &&
      height > 0,
  }
}
