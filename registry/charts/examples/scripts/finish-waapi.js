// Static endpoint control only. Intermediate motion is captured separately without this script.
// Keep real browser Animations and their completion events. Finish finite WAAPI timelines before paint.
;(() => {
  const original = Element.prototype.animate
  window.__chartsCapture = { mode: 'finish-finite-waapi-before-paint', acquired: 0, finished: 0 }
  Element.prototype.animate = function (...args) {
    const animation = Reflect.apply(original, this, args)
    window.__chartsCapture.acquired++
    queueMicrotask(() => {
      const end = animation.effect?.getComputedTiming().endTime
      if (typeof end === 'number' && Number.isFinite(end) && animation.playState !== 'idle') {
        animation.finish()
        window.__chartsCapture.finished++
      }
    })
    return animation
  }
})()
