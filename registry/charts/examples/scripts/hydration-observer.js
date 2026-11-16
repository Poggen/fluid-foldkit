;(() => {
  const receipt = { frames: [], warnings: [], stopped: false }
  window.__chartsHydration = receipt
  const warn = console.warn
  console.warn = function (...args) {
    if (String(args[0]).includes('hydration')) receipt.warnings.push(args.map(String).join(' '))
    return Reflect.apply(warn, this, args)
  }
  let total = 0
  let liveFrames = 0
  const frame = (time) => {
    const fixture = document.querySelector('#fixture')
    if (fixture) {
      const charts = [...fixture.querySelectorAll('[data-bkm-chart]')]
      const painted = charts.filter((chart) => getComputedStyle(chart).visibility !== 'hidden')
      const reserve = fixture.querySelectorAll('[data-bkm-server-reserve]').length
      const live = fixture.querySelectorAll('fk-bklit-gauge svg.ts-chart').length
      receipt.frames.push({
        time,
        charts: charts.length,
        painted: painted.length,
        reserve,
        live,
        paths: fixture.querySelectorAll('path,rect').length,
      })
      if (live > 0 && reserve === 0) liveFrames++
    }
    if (++total < 240 && liveFrames < 8) requestAnimationFrame(frame)
    else receipt.stopped = true
  }
  requestAnimationFrame(frame)
})()
