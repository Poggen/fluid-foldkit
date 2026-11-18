import { Predicate } from 'effect'

export const sourceDate: (value: unknown) => Date = function sourceDate(value: unknown) {
  if (Predicate.isDate(value)) {
    return value
  }

  const NativeDate: new (value: unknown) => Date = globalThis.Date

  // oxlint-disable-next-line landmines-style/no-comments -- Required Effect compiler directive.
  // @effect-diagnostics-next-line globalDate:off -- Native Date coercion preserves Source identity, invalid values, and throws.
  return new NativeDate(value)
}
