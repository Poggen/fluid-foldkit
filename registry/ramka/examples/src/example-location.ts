import type { Example } from './example-data'

export const examplePage = '/ramka/lightbox'
export const interceptedHeadingId = 'ramka-intercepted-routes-heading'
export const parameter = (example: Example) =>
  example === 'url-synced-state'
    ? 'ramka-photo'
    : example === 'intercepted-routes'
      ? 'ramka-route'
      : undefined

function openedInDocument(window: Window, example: Example) {
  return (
    window.history.state?.ramkaExample === example &&
    window.history.state?.ramkaDocument === window.performance.timeOrigin
  )
}

export function selectedPhoto(window: Window, example: Example) {
  const key = parameter(example)
  if (key === undefined) return { id: null, intercepted: false }
  return {
    id: new URLSearchParams(window.location.search).get(key),
    intercepted: openedInDocument(window, example),
  }
}

export function writePhoto(example: Example, id: string | null) {
  const key = parameter(example)
  const url = new URL(window.location.href)
  if (key === undefined || url.pathname !== examplePage || url.searchParams.get(key) === id) return
  if (id === null && openedInDocument(window, example)) {
    window.history.back()
    return
  }
  if (id === null) url.searchParams.delete(key)
  else {
    url.searchParams.set(key, id)
    if (example === 'intercepted-routes') url.hash = interceptedHeadingId
  }
  if (id !== null && !new URLSearchParams(window.location.search).has(key))
    window.history.pushState(
      {
        ...window.history.state,
        ramkaExample: example,
        ramkaDocument: window.performance.timeOrigin,
      },
      '',
      url,
    )
  else window.history.replaceState(window.history.state, '', url)
}
