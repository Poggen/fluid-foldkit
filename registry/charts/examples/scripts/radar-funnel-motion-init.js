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
      ['radar', 'funnel'].map((family) => {
        const root = document.getElementById(`${family}-fixture`)
        const ancestors = []
        const byElement = new Map()
        const ancestry = (element) => {
          const indices = []
          for (
            let parent = element.parentElement;
            parent !== null && parent !== root;
            parent = parent.parentElement
          ) {
            let index = byElement.get(parent)
            if (index === undefined) {
              index = ancestors.length
              byElement.set(parent, index)
              const style = getComputedStyle(parent)
              ancestors.push({
                tag: parent.tagName,
                class: parent.getAttribute('class'),
                transform: style.transform,
                scale: style.scale,
                opacity: style.opacity,
                transformOrigin: style.transformOrigin,
                width: style.width,
                height: style.height,
              })
            }
            indices.push(index)
          }
          return indices
        }
        const nodes = [...(root?.querySelectorAll('svg g,svg path,svg text,svg circle') ?? [])].map(
          (node) => {
            const style = getComputedStyle(node)
            return {
              tag: node.tagName,
              class: node.getAttribute('class'),
              d: node.getAttribute('d'),
              cx: node.getAttribute('cx'),
              cy: node.getAttribute('cy'),
              r: node.getAttribute('r'),
              text: node.tagName === 'text' ? node.textContent : undefined,
              transform: style.transform,
              scale: style.scale,
              opacity: style.opacity,
              visibility: style.visibility,
              ancestors: ancestry(node),
            }
          },
        )
        return [family, { nodes, ancestors }]
      }),
    )
    trace.frames.push({ t, hidden: document.hidden, families })
    if (trace.frames.length < 240) requestAnimationFrame(sample)
    else trace.done = true
  }
  requestAnimationFrame(sample)
})()
