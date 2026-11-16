;(() => {
  const trace = { measurements: [], layouts: [], mutations: [], sizeEvents: [] }
  window.funnelLayoutTrace = trace
  const original = Element.prototype.getBoundingClientRect
  let observed
  let stageSeen = false
  const root = () =>
    document.querySelector('#funnel-fixture [data-bkm-chart="funnel"]') ??
    document.querySelector('#funnel-fixture > div')
  const owned = (element) => element === root()
  function measuredRect() {
    const rect = original.call(this)
    if (owned(this)) {
      trace.measurements.push({
        t: performance.now(),
        width: rect.width,
        height: rect.height,
        stack: new Error().stack,
      })
    }
    return rect
  }
  Element.prototype.getBoundingClientRect = measuredRect
  const resize = new ResizeObserver((entries) => {
    for (const entry of entries) {
      trace.layouts.push({
        t: performance.now(),
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      })
    }
  })
  const changed = () => {
    const element = root()
    if (element !== null && element !== observed) {
      resize.disconnect()
      observed = element
      resize.observe(element)
      trace.mutations.push({ t: performance.now(), kind: 'root' })
    }
    if (!stageSeen && document.querySelector('#funnel-fixture svg path') !== null) {
      stageSeen = true
      trace.mutations.push({ t: performance.now(), kind: 'stage' })
    }
  }
  const mutations = new MutationObserver(changed)
  mutations.observe(document.querySelector('#funnel-fixture'), { childList: true, subtree: true })
  const sizeEvent = (event) => {
    if (document.querySelector('#funnel-fixture')?.contains(event.target)) {
      trace.sizeEvents.push({ t: performance.now(), detail: event.detail })
    }
  }
  document.addEventListener('size-observed', sizeEvent, true)
  changed()
  window.cleanFunnelLayout = () => {
    if (Element.prototype.getBoundingClientRect === measuredRect) {
      Element.prototype.getBoundingClientRect = original
    }
    resize.disconnect()
    mutations.disconnect()
    document.removeEventListener('size-observed', sizeEvent, true)
  }
})()
