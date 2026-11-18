;(async () => {
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
  const until = async (predicate) => {
    for (let index = 0; index < 180; index++) {
      if (predicate()) return
      await frame()
    }
    throw new Error('Banner timing condition deadline')
  }
  const root = () => document.querySelector('#column [data-slot="banner"]')
  await until(() => root() !== null)
  await document.fonts.ready
  const events = []
  const inputs = (event) =>
    events.push({ kind: 'input', time: event.timeStamp, id: event.target?.id })
  document.addEventListener('click', inputs, true)
  const observer = new MutationObserver((records) =>
    events.push({
      kind: records.some((record) => record.attributeName === 'data-fixture-open')
        ? 'commit'
        : 'dom-mutation',
      time: performance.now(),
      mutations: records.map((record) => ({
        type: record.type,
        attribute: record.attributeName,
        value:
          record.target instanceof HTMLElement && record.attributeName !== null
            ? record.target.getAttribute(record.attributeName)
            : null,
        target:
          record.target instanceof HTMLElement
            ? record.target.id || record.target.className
            : record.target.nodeName,
      })),
      exists: root() !== null,
    }),
  )
  observer.observe(document.querySelector('.banner-page'), {
    attributes: true,
    childList: true,
    subtree: true,
  })
  const samples = []
  const track = async (label) => {
    for (let index = 0; index < 36; index++) {
      const time = await frame(),
        body = root(),
        content = body?.parentElement,
        row = content?.parentElement?.parentElement
      samples.push({
        label,
        time,
        exists: body !== null,
        row: row?.style.gridTemplateRows,
        opacity: content?.style.opacity,
        transform: content?.style.transform,
        waapi: content?.getAnimations().map((animation) => ({
          currentTime: animation.currentTime,
          startTime: animation.startTime,
          playState: animation.playState,
        })),
      })
    }
  }
  document.getElementById('close')?.click()
  await track('close')
  document.getElementById('open')?.click()
  await track('open')
  document.getElementById('close')?.click()
  for (let index = 0; index < 4; index++) await frame()
  document.getElementById('open')?.click()
  await track('reverse')
  observer.disconnect()
  document.removeEventListener('click', inputs, true)
  return { events, samples, visibility: document.visibilityState, focused: document.hasFocus() }
})()
