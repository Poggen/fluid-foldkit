/* @license Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud. */
import { Schema } from 'effect'

export const Rect = Schema.Struct({
  top: Schema.Finite,
  left: Schema.Finite,
  width: Schema.Finite,
  height: Schema.Finite,
})

export type Rect = typeof Rect.Type

const Entry = Schema.Struct({ index: Schema.Finite, rect: Rect })

const arrayIndex = (index: number) => Number.isInteger(index) && index >= 0 && index < 4_294_967_295

export const IndexedGeometry = Schema.Struct({
  length: Schema.Natural.check(Schema.isLessThanOrEqualTo(4_294_967_295)),
  entries: Schema.Array(Entry),
}).check(
  Schema.makeFilter(
    (geometry) =>
      new Set(geometry.entries.map(({ index }) => index)).size === geometry.entries.length &&
      geometry.entries.every(({ index }) => !arrayIndex(index) || index < geometry.length),
  ),
)

export type IndexedGeometry = typeof IndexedGeometry.Type

export const emptyGeometry: IndexedGeometry = { length: 0, entries: [] }

export const geometryFromEntries: (entries: ReadonlyArray<typeof Entry.Type>) => IndexedGeometry = (
  entries: ReadonlyArray<typeof Entry.Type>,
) => {
  const unique = new Map<number, Rect>()

  let length = 0

  for (const { index, rect } of entries) {
    unique.set(index === 0 ? 0 : index, rect)

    if (arrayIndex(index)) {
      length = Math.max(length, index + 1)
    }
  }

  return {
    length,
    entries: [...unique].map(([index, rect]) => ({ index, rect })),
  }
}

export const geometryFromArray: (
  rects: ReadonlyArray<Rect | null | undefined>,
) => IndexedGeometry = (rects: ReadonlyArray<Rect | null | undefined>) => ({
  length: rects.length,
  entries: Object.keys(rects).flatMap((key) => {
    const index = Number(key)
    const rect = rects[index]

    return Number.isFinite(index) && String(index) === key && rect !== null && rect !== undefined
      ? [{ index, rect }]
      : []
  }),
})

const isRectArray = (
  geometry: IndexedGeometry | ReadonlyArray<Rect | null | undefined>,
): geometry is ReadonlyArray<Rect | null | undefined> => Array.isArray(geometry)

export const normalizeGeometry: (
  geometry: IndexedGeometry | ReadonlyArray<Rect | null | undefined>,
) => IndexedGeometry = (geometry: IndexedGeometry | ReadonlyArray<Rect | null | undefined>) =>
  isRectArray(geometry) ? geometryFromArray(geometry) : geometry

export const rectAt: (geometry: IndexedGeometry, index: number) => Rect | undefined = (
  geometry: IndexedGeometry,
  index: number,
) => geometry.entries.find((entry) => entry.index === index)?.rect

export const integerGeometryEntries = (geometry: IndexedGeometry) =>
  geometry.entries.filter(({ index }) => arrayIndex(index)).toSorted((a, b) => a.index - b.index)

export const samePublishedGeometry = (previous: IndexedGeometry, next: IndexedGeometry) => {
  if (previous.length !== next.length) {
    return false
  }

  const before = integerGeometryEntries(previous)
  const after = integerGeometryEntries(next)

  return (
    before.length === after.length &&
    before.every((entry, position) => {
      const current = after[position]

      return (
        current !== undefined &&
        entry.index === current.index &&
        entry.rect.top === current.rect.top &&
        entry.rect.left === current.rect.left &&
        entry.rect.width === current.rect.width &&
        entry.rect.height === current.rect.height
      )
    })
  )
}
