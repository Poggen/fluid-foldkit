;(() => {
  const request = window.requestAnimationFrame.bind(window)
  const cancel = window.cancelAnimationFrame.bind(window)
  const pending = new Map()
  let observed = 0
  window.requestAnimationFrame = (callback) => {
    const id = request((timestamp) => {
      pending.delete(id)
      observed++
      callback.call(window, timestamp)
    })
    pending.set(id, callback.name)
    return id
  }
  window.cancelAnimationFrame = (id) => {
    pending.delete(id)
    cancel(id)
  }
  window.chartFrameObservation = {
    request,
    snapshot: () => ({ pending: [...pending], observed }),
  }
})()
