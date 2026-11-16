;(async () => {
  const frames = [...document.querySelectorAll('iframe')]
  if (frames.length !== 2) throw new Error('Comparison requires exactly two visible frames')
  const documents = frames.map((frame) => frame.contentDocument)
  if (documents.some((value) => !value)) throw new Error('Comparison frames must be same-origin')
  await Promise.all(documents.map((doc) => doc.fonts.ready))
  const samples = []
  const raf = () => new Promise((resolve) => requestAnimationFrame(resolve))
  const facts = () => ({
    visibility: document.visibilityState,
    focus: document.hasFocus(),
    active: navigator.userActivation.hasBeenActive,
    frames: documents.map((doc) => ({
      visibility: doc.visibilityState,
      focus: doc.hasFocus(),
      timeOrigin: doc.defaultView.performance.timeOrigin,
    })),
  })
  const read = (rootId, phase, timestamp) => ({
    phase,
    timestamp,
    facts: facts(),
    states: documents.map((doc) => {
      const root = doc.getElementById(rootId)
      if (!root) throw new Error('Missing comparison root ' + rootId)
      return {
        requests: doc.querySelector('main')?.getAttribute('data-requests'),
        root: root.getBoundingClientRect().toJSON(),
        buttons: [...root.querySelectorAll('button')].map((button) => ({
          label: button.textContent,
          expanded: button.getAttribute('aria-expanded'),
          disabled: button.disabled,
          rect: button.getBoundingClientRect().toJSON(),
          chevron: getComputedStyle(button.lastElementChild).transform,
        })),
        panels: [...root.querySelectorAll('[role=region]')].map((panel) => {
          const motion = panel.matches('.overflow-hidden')
            ? panel
            : panel.querySelector('.overflow-hidden')
          const style = getComputedStyle(motion)
          return {
            hidden: panel.hidden,
            rect: panel.getBoundingClientRect().toJSON(),
            height: style.height,
            opacity: style.opacity,
          }
        }),
      }
    }),
  })
  if (document.visibilityState !== 'visible' || !document.hasFocus())
    throw new Error('A real visible focused comparison surface is required')
  const rootId = new URLSearchParams(location.search).get('root') ?? 'radix-group'
  const roots = documents.map((doc) => doc.getElementById(rootId))
  const triggers = roots.map((root) =>
    [...root.querySelectorAll('button')].filter((button) => !button.disabled),
  )
  samples.push(read(rootId, 'initial', await raf()))
  for (const buttons of triggers) buttons[1].click()
  for (let index = 0; index < 12; index += 1) samples.push(read(rootId, 'switch', await raf()))
  for (const buttons of triggers) buttons[1].click()
  samples.push(read(rootId, 'close-start', await raf()))
  for (const buttons of triggers) buttons[1].click()
  for (let index = 0; index < 12; index += 1) samples.push(read(rootId, 'interrupt', await raf()))
  for (const doc of documents)
    [...doc.querySelectorAll('button')]
      .find((button) => button.textContent === 'Resize content')
      .click()
  for (let index = 0; index < 6; index += 1) samples.push(read(rootId, 'resize', await raf()))
  if (samples.some((sample) => sample.facts.visibility !== 'visible' || !sample.facts.focus))
    throw new Error('Comparison lost actual visibility or OS focus')
  return {
    status: 'captured',
    sourceControl: new URLSearchParams(location.search).get('self') === '1',
    syntheticStimulus: true,
    rootId,
    samples,
  }
})()
