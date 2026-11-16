// Derived from Motion 14.1.0 Reorder Group/check-reorder. MIT, copyright Framer B.V.
export type ReorderAxis = 'x' | 'y'
export interface ReorderBox {
  readonly x: { readonly min: number; readonly max: number }
  readonly y: { readonly min: number; readonly max: number }
}

/** Preserve unmeasured slots exactly as Reorder.Group does. */
export function reorderedIds(
  ids: ReadonlyArray<string>,
  layouts: ReadonlyMap<string, ReorderBox>,
  id: string,
  offset: number,
  velocity: number,
  axis: ReorderAxis,
): ReadonlyArray<string> {
  if (!velocity) return ids
  const measured = ids.filter((value) => layouts.has(value))
  const index = measured.indexOf(id)
  if (index < 0) return ids
  const direction = velocity > 0 ? 1 : -1
  const neighbor = measured[index + direction]
  if (neighbor === undefined) return ids
  const currentBox = layouts.get(id)?.[axis]
  const neighborBox = layouts.get(neighbor)?.[axis]
  if (!currentBox || !neighborBox) return ids
  const center = (neighborBox.min + neighborBox.max) / 2
  if (!(direction === 1 ? currentBox.max + offset > center : currentBox.min + offset < center))
    return ids
  const next = [...ids]
  const sourceIndex = ids.indexOf(id)
  const targetIndex = ids.indexOf(neighbor)
  next[sourceIndex] = neighbor
  next[targetIndex] = id
  return next
}
