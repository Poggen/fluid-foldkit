import { Predicate } from 'effect'

export function sourceDate(value: unknown): Date {
  if (Predicate.isDate(value)) {
    return value
  }

  const NativeDate: new (value: unknown) => Date = globalThis.Date

  // @effect-diagnostics-next-line globalDate:off -- Native Date coercion preserves Source identity, invalid values, and throws.
  return new NativeDate(value)
}
