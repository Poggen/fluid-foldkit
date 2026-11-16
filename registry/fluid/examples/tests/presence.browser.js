;(async () => {
  const findButton = (name) =>
    [...document.querySelectorAll('button')].find((node) => node.textContent === name)
  const click = (name) => {
    const button = findButton(name)
    if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing button ${name}`)
    button.click()
  }
  const frames = []
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
  const read = (action) => {
    const element = document.querySelector('#presence-panel')
    const style = element ? getComputedStyle(element) : null
    const sample = {
      action,
      phase: document.querySelector('#phase')?.textContent,
      attached: element !== null,
      opacity: style ? Number(style.opacity) : null,
      transform: style?.transform ?? null,
      width: element?.getBoundingClientRect().width ?? null,
    }
    frames.push(sample)
    return sample
  }
  async function until(action, predicate) {
    for (let index = 0; index < 180; index += 1) {
      await frame()
      const sample = read(action)
      if (predicate(sample)) return sample
    }
    throw new Error(`Frame bound exceeded during ${action}`)
  }
  click('Show')
  await until('enter', (sample) => sample.opacity === 1 && sample.transform === 'none')
  const identity = document.querySelector('#presence-panel')
  click('Hide')
  await until(
    'exit',
    (sample) => sample.phase === 'Exiting' && sample.opacity > 0 && sample.opacity < 0.8,
  )
  if (document.querySelector('#presence-panel') !== identity)
    throw new Error('Exit replaced the live element')
  click('Show')
  await until('interrupt', (sample) => {
    if (document.querySelector('#presence-panel') !== identity)
      throw new Error('Interrupted exit lost element identity')
    return sample.phase === 'Present' && sample.opacity === 1 && sample.transform === 'none'
  })
  const startWidth = identity.getBoundingClientRect().width
  click('Resize')
  await until('resize', (sample) => sample.width > startWidth + 100 && sample.transform === 'none')
  const resize = frames.filter((sample) => sample.action === 'resize')
  const endWidth = identity.getBoundingClientRect().width
  if (!resize.some((sample) => sample.width > startWidth + 1 && sample.width < endWidth - 1)) {
    throw new Error('Resize did not expose an intermediate projected frame')
  }
  click('Hide')
  await until('close', (sample) => sample.phase === 'Closed' && !sample.attached)
  const lastVisible = frames.filter((sample) => sample.action === 'close' && sample.attached).at(-1)
  if (!lastVisible || lastVisible.opacity !== 0)
    throw new Error('Element was removed before the fade completed')
  return {
    status: 'passed',
    contracts: [
      'completion-driven removal',
      'interrupted exit identity',
      'intermediate layout projection',
    ],
    frames,
  }
})()
