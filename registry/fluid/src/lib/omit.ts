// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
// See NOTICE
/**
 * A shallow copy of `object` without `keys`: the same own properties a
 * `{ key: _key, ...rest }` destructure keeps, without the unused binding.
 * Components use it to drop props before spreading the rest onto an
 * element (framer-motion's own onDrag/onAnimation* handlers, a primitive's
 * style, a prop the other flavor reads).
 */
export function omit<T extends object, K extends keyof T>(
  object: T,
  keys: ReadonlyArray<K>,
): Omit<T, K> {
  const rest = { ...object }

  for (const key of keys) delete rest[key]

  return rest
}
