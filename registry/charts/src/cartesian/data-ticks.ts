import { DateTime } from 'effect'
import { selectEvenlySpacedIndices } from './tick-layout'

const fromMillis = (value: number): Date => DateTime.toDateUtc(DateTime.makeUnsafe(value))

const shortDateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

/** Evenly spaced data-row indices, first and last included (bklit `tickMode="data"`). */
export function dataTickValues<Row>(
  rows: ReadonlyArray<Row>,
  x: (row: Row) => Date,
  count: number,
  brushed?: readonly [Date, Date],
): Array<Date> {
  if (rows.length === 0) {
    return []
  }

  // bklit buildDataAlignedTicks: the even-spacing search over the rows (the brushed window's rows when brushed).
  const times = rows.map((row) => x(row).getTime())
  const labels = times.map((t) => shortDateFmt.format(fromMillis(t)))
  const picked = selectEvenlySpacedIndices(rows.length, count, labels, (i) => times[i] ?? 0)
  const seen = new Set<string>()
  const out: Array<Date> = []

  for (const index of picked) {
    const label = labels[index] ?? String(index)

    if (!seen.has(label)) {
      seen.add(label)
      out.push(fromMillis(times[index] ?? 0))
    }
  }

  if (brushed) {
    // bklit appendProjectionTailTicks: a window ending past its last row gets labels in that tail (mid-points, then the end).
    const lastTime = times.at(-1)
    const endTime = Math.max(brushed[0].getTime(), brushed[1].getTime())

    if (lastTime !== undefined && endTime > lastTime) {
      const extraCount = Math.min(Math.max(1, count - out.length + 1), 3)

      for (let i = 1; i <= extraCount; i += 1) {
        const date = fromMillis(lastTime + (i / (extraCount + 1)) * (endTime - lastTime))
        const label = shortDateFmt.format(date)

        if (!seen.has(label)) {
          seen.add(label)
          out.push(date)
        }
      }

      const endLabel = shortDateFmt.format(fromMillis(endTime))

      if (!seen.has(endLabel)) {
        out.push(fromMillis(endTime))
      }
    }
  }

  return out
}
