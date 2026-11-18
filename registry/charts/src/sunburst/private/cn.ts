export const joinClasses: (...names: ReadonlyArray<string | boolean | undefined>) => string = (
  ...names: ReadonlyArray<string | boolean | undefined>
) => names.filter(Boolean).join(' ')
