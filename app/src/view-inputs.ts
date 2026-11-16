export const memoizeObject = <Key extends object, Value>(build: (key: Key) => Value) => {
  const entries = new WeakMap<Key, { readonly value: Value }>()
  return (key: Key): Value => {
    const previous = entries.get(key)
    if (previous !== undefined) return previous.value
    const value = build(key)
    entries.set(key, { value })
    return value
  }
}

// Callers use the finite authored occurrence and loading/pulse variants, never user input.
export const memoizeVariant = <Value>() => {
  const entries = new Map<string, Value>()
  return (key: string, build: () => Value): Value => {
    const previous = entries.get(key)
    if (previous !== undefined) return previous
    const value = build()
    entries.set(key, value)
    return value
  }
}
