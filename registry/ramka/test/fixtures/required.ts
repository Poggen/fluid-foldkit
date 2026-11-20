export const required = <Value>(value: Value | null | undefined) => {
  if (value === undefined || value === null) throw new Error('Expected an existing fixture value')
  return value
}
