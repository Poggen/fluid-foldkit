import { Predicate } from 'effect'

export const css: (value: Readonly<Record<string, string | number>>) => Record<string, string> =
  function css(value: Readonly<Record<string, string | number>>) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        Predicate.isNumber(entry) ? `${entry}px` : entry,
      ]),
    )
  }
