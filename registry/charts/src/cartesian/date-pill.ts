export const PILL_LIVE_X = '--bkm-pill-x'

/** Fixed pill layout measured once per definition (bklit's stacked date ticker): box width and the text centre offsets from the pill centre. */
export interface PillLayout {
  readonly width: number
  /** Month text centre minus pill centre (px): the month is centred in a column as wide as the widest month. */
  readonly month?: number
  /** Day text centre minus pill centre (px): the day is centred in a column as wide as the widest day. */
  readonly day?: number
  /** One entry per run of consecutive equal month words (bklit's `monthSegments`): the rows of the month stack. */
  readonly months: ReadonlyArray<string>
  /** Per label: the index of its month run (the month stack only moves when the run changes). */
  readonly monthOf: ReadonlyArray<number>
  /** Per label: the day word (the rows of the day stack). */
  readonly days: ReadonlyArray<string>
}

const round2 = (v: number): number => Math.round(v * 100) / 100

/** bklit's date ticker: 16px padding, a month column (widest month), a 4px gap, a day column (widest day), each text centred in its column.
 * Above 60 labels bklit uses a compact text-sized pill (null: one native label). The native box is widened to `width` by pillTickStaticCss. */
export function pillLayout(
  labels: ReadonlyArray<string>,
  measurePill: (text: string) => number | null,
): PillLayout | null {
  if (labels.length === 0 || labels.length > 60) {
    return null
  }

  let month = 0
  let day = 0
  const months: Array<string> = []
  const monthOf: Array<number> = []
  const days: Array<string> = []

  for (const label of labels) {
    const [m = '', d = ''] = label.split(' ')
    const mw = measurePill(m)
    const dw = measurePill(d)

    if (mw === null || dw === null) {
      return null
    }

    month = Math.max(month, mw)
    day = Math.max(day, dw)

    if (months.length === 0 || months.at(-1) !== m) {
      months.push(m)
    }

    monthOf.push(months.length - 1)
    days.push(d)
  }

  return {
    width: Math.round((32 + month + 4 + day) * 10) / 10,
    month: round2(-2 - day / 2),
    day: round2(2 + month / 2),
    months,
    monthOf,
    days,
  }
}
