;(() => {
  const trace = { frames: [], events: [], done: false }
  window.polarMotionTrace = trace
  for (const type of ['pointermove', 'pointerdown', 'pointerup', 'keydown']) {
    document.addEventListener(
      type,
      (event) => trace.events.push({ type, t: event.timeStamp, trusted: event.isTrusted }),
      true,
    )
  }
  const sample = (t) => {
    const families = Object.fromEntries(
      ['pie', 'ring'].map((family) => {
        const root = document.getElementById(`${family}-fixture`)
        const nodes = [...(root?.querySelectorAll('svg g,svg path') ?? [])]
        return [
          family,
          nodes.map((node) => {
            const style = getComputedStyle(node)
            return {
              tag: node.tagName,
              class: node.getAttribute('class'),
              d: node.getAttribute('d'),
              paintedD: style.d,
              fill: style.fill,
              transform: style.transform,
              scale: style.scale,
              visibility: style.visibility,
              pointerEvents: style.pointerEvents,
              opacity: style.opacity,
            }
          }),
        ]
      }),
    )
    trace.frames.push({ t, hidden: document.hidden, families })
    if (trace.frames.length < 240) requestAnimationFrame(sample)
    else trace.done = true
  }
  requestAnimationFrame(sample)
})()
