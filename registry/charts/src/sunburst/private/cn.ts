export const joinClasses = (...names: ReadonlyArray<string | boolean | undefined>): string =>
  names.filter(Boolean).join(' ')
