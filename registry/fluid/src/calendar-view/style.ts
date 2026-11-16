import { Predicate } from 'effect'
// Foldkit's checked Style factory deliberately accepts CSS strings only.
export function css(value: Readonly<Record<string, string | number>>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      Predicate.isNumber(entry) ? `${entry}px` : entry,
    ]),
  )
}
