;(() => {
  if (document.visibilityState !== 'visible') throw new Error('PARITY_SETUP_HIDDEN')
  const frames = []
  const inputs = []
  const capture = (event) =>
    inputs.push({
      type: event.type,
      timeStamp: event.timeStamp,
      label: event.target instanceof Element ? event.target.closest('button')?.textContent : '',
    })
  document.addEventListener('pointerdown', capture, true)
  document.addEventListener('keydown', capture, true)
  let finish
  window.colorScrollMotionDone = new Promise((resolve) => {
    finish = resolve
  })
  const tick = (timestamp) => {
    const menu = document.querySelector('[role=menu]')
    const node = menu?.parentElement
    const css = node ? getComputedStyle(node) : null
    frames.push({
      timestamp,
      visible: document.visibilityState,
      opacity: css?.opacity ?? null,
      transform: css?.transform ?? null,
      menu: menu ? menu.getBoundingClientRect().toJSON() : null,
    })
    if (frames.length < 90) requestAnimationFrame(tick)
    else {
      document.removeEventListener('pointerdown', capture, true)
      document.removeEventListener('keydown', capture, true)
      finish({ inputs, frames })
    }
  }
  requestAnimationFrame(tick)
  return { recording: true }
})()
