;(async () => {
  const frames = []
  const sample = () => {
    const path = document.getElementById('check-path')
    return {
      present: Boolean(document.getElementById('presence-panel')),
      length: path ? parseFloat(path.getAttribute('stroke-dasharray')) : null,
    }
  }
  const wait = async (stage, predicate) => {
    for (let index = 0; index < 120; index += 1) {
      const current = sample()
      frames.push({ stage, ...current })
      if (predicate(current)) return
      await new Promise(requestAnimationFrame)
    }
    throw new Error(`Did not complete ${stage}`)
  }
  document.getElementById('show').click()
  await wait('enter', (state) => state.present && state.length === 1)
  document.getElementById('hide').click()
  await wait('exit', (state) => !state.present)
  if (
    !frames.some(
      (frame) => frame.stage === 'exit' && frame.present && frame.length > 0 && frame.length < 1,
    )
  )
    throw new Error('Parent removed before descendant exit')
  document.getElementById('show').click()
  await wait('reenter', (state) => state.present && state.length === 1)
  const retained = document.getElementById('check-path')
  document.getElementById('hide').click()
  await wait('interrupt-exit', (state) => state.present && state.length < 1)
  document.getElementById('show').click()
  await wait('interrupted-return', (state) => state.present && state.length === 1)
  if (document.getElementById('check-path') !== retained)
    throw new Error('Interrupted descendant was replaced')
  return {
    status: 'passed',
    contracts: [
      'inherited descendant exit',
      'parent waits for child completion',
      'interruption retains child identity',
    ],
    frames,
  }
})()
