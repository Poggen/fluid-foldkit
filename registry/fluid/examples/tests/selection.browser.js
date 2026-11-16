;(async () => {
  const assert = (value, message) => {
    if (!value) throw new Error(message)
  }
  const query = (selector) => {
    const element = document.querySelector(selector)
    assert(element instanceof HTMLElement, `Missing ${selector}`)
    return element
  }
  const blocks = () => [...document.querySelectorAll('#selection-region .bg-active')]
  const geometry = () =>
    blocks().map((element) => {
      const style = getComputedStyle(element)
      return {
        top: parseFloat(style.top),
        height: parseFloat(style.height),
        left: parseFloat(style.left),
        width: parseFloat(style.width),
        opacity: Number(style.opacity),
        radii: [
          style.borderTopLeftRadius,
          style.borderTopRightRadius,
          style.borderBottomRightRadius,
          style.borderBottomLeftRadius,
        ].map(parseFloat),
      }
    })
  const frames = []
  const inputs = []
  const sample = (name) => frames.push({ name, time: performance.now(), blocks: geometry() })
  const frame = async (name) => {
    await new Promise(requestAnimationFrame)
    sample(name)
  }
  const wait = async (predicate, name) => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (predicate()) {
        sample(`${name}-settled`)
        return
      }
      await frame(name)
    }
    throw new Error(`No ${name}: ${JSON.stringify(geometry())}`)
  }
  const click = (id) => {
    inputs.push({ id, time: performance.now() })
    query(`#${id}`).click()
  }
  const steadySplit = () => {
    const current = geometry()
    return (
      current.length === 2 &&
      current.every((rect) => rect.height === 40 && rect.opacity === 1) &&
      current[0].top === 24 &&
      current[1].top === 128
    )
  }
  const steadyMerge = () => {
    const current = geometry()
    return (
      current.length === 1 &&
      current[0].height === 144 &&
      current[0].top === 24 &&
      current[0].opacity === 1
    )
  }
  await wait(steadySplit, 'initial')
  const survivor = blocks()[0]
  click('merge')
  await wait(steadyMerge, 'merge')
  assert(blocks()[0] === survivor, 'Merging replaced the surviving background')
  assert(
    frames.some(
      (frame) =>
        frame.name === 'merge' &&
        frame.blocks.length === 2 &&
        frame.blocks[0].height > 40 &&
        frame.blocks[0].height < 72,
    ),
    'Merge has no intermediate converging edges',
  )
  click('split')
  await wait(steadySplit, 'split')
  assert(blocks()[0] === survivor, 'Splitting replaced the surviving background')
  assert(
    frames.some(
      (frame) =>
        frame.name === 'split' &&
        frame.blocks.length === 2 &&
        frame.blocks[0].height > 40 &&
        frame.blocks[0].height <= 72,
    ),
    'Split has no seam-to-row motion',
  )
  click('merge')
  await frame('interrupted-merge')
  await frame('interrupted-merge')
  click('split')
  await frame('interrupted-split')
  await frame('interrupted-split')
  click('merge')
  await frame('interrupted-merge')
  await frame('interrupted-merge')
  click('split')
  await wait(steadySplit, 'interrupted-settled')
  assert(blocks()[0] === survivor, 'Rapid reversal replaced the survivor')
  click('clear')
  await wait(() => blocks().length === 0, 'clear')
  assert(
    frames.some(
      (frame) =>
        frame.name === 'clear' && frame.blocks.some((rect) => rect.opacity > 0 && rect.opacity < 1),
    ),
    'Cleared selection did not retain its fading exit',
  )
  click('reset')
  await wait(steadySplit, 'reset')
  click('merge')
  await frame('before-unmount')
  click('toggle')
  await wait(() => blocks().length === 0, 'unmounted')
  click('toggle')
  await wait(steadyMerge, 'remounted')
  const deadline = performance.now() + 400
  while (performance.now() < deadline) await frame('released-clock-window')
  assert(steadyMerge(), 'A released clock changed the remounted selection')
  return { status: 'passed', inputs, frames }
})()
