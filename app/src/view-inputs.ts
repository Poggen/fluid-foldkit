export const memoizeObject = <Key extends object, Value>(build: (key: Key) => Value) => {
  const entries = new WeakMap<Key, { readonly value: Value }>()
  return (key: Key) => {
    const previous = entries.get(key)
    if (previous !== undefined) return previous.value satisfies Value
    const value = build(key)
    entries.set(key, { value })
    return value satisfies Value
  }
}

export const memoizeVariant = <Value>() => {
  const entries = new Map<string, Value>()
  return (key: string, build: () => Value) => {
    const previous = entries.get(key)
    if (previous !== undefined) return previous satisfies Value
    const value = build()
    entries.set(key, value)
    return value satisfies Value
  }
}
