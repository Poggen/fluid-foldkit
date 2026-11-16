;(async () => {
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
  const body = () => document.querySelector('#column [data-slot="banner"]')
  const until = async (predicate, label) => {
    for (let index = 0; index < 240; index++) {
      if (predicate()) return
      await frame()
    }
    throw new Error(`Preference deadline: ${label}`)
  }
  await until(() => document.getElementById('close') !== null, 'app bootstrap')
  await document.fonts.ready
  if (body() !== null) {
    document.getElementById('close')?.click()
    await until(() => body() === null, 'close')
    return {
      stage: 'closed',
      media: matchMedia('(prefers-reduced-motion:reduce)').matches,
      visibility: document.visibilityState,
    }
  }
  const trace = []
  document.getElementById('open')?.click()
  for (let index = 0; index < 240; index++) {
    const time = await frame(),
      element = body(),
      content = element?.parentElement,
      row = content?.parentElement?.parentElement
    if (!content) continue
    const transform = content.style.transform,
      match = transform.match(/scale\(([\d.e+-]+)\)/),
      scale = match ? Number(match[1]) : 1
    trace.push({
      time,
      row: row.style.gridTemplateRows,
      opacity: content.style.opacity,
      transform,
      scale,
    })
    if (
      row.style.gridTemplateRows === '1fr' &&
      content.style.opacity === '1' &&
      transform === 'none'
    )
      break
  }
  const settled = trace.at(-1)
  if (
    settled === undefined ||
    settled.row !== '1fr' ||
    settled.opacity !== '1' ||
    settled.transform !== 'none'
  ) {
    throw new Error(`Preference open did not settle: ${JSON.stringify(trace.slice(-3))}`)
  }
  return {
    stage: 'opened',
    trace,
    minimumScale: Math.min(...trace.map((item) => item.scale)),
    media: matchMedia('(prefers-reduced-motion:reduce)').matches,
    visibility: document.visibilityState,
  }
})()
