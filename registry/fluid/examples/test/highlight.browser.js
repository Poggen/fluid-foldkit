;(async () => {
  const assert = (value, message) => {
    if (!value) throw new Error(message)
  }
  const query = (selector) => {
    const element = document.querySelector(selector)
    assert(element instanceof HTMLElement, `Missing ${selector}`)
    return element
  }
  const state = () => JSON.parse(query('#snapshot').textContent)
  const rect = (element) => {
    const r = element.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  const highlights = () => [...document.querySelectorAll('[data-slot=fluid-hover-highlight]')]
  const frame = () =>
    highlights().map((element) => {
      const style = getComputedStyle(element)
      const transform = new DOMMatrixReadOnly(style.transform)
      return {
        opacity: Number(style.opacity),
        x: transform.m41,
        y: transform.m42,
        width: parseFloat(style.width),
        height: parseFloat(style.height),
        animations: element.getAnimations().map((animation) => ({
          currentTime: animation.currentTime,
          startTime: animation.startTime,
          playState: animation.playState,
          timing: animation.effect?.getComputedTiming(),
          keyframes:
            animation.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : [],
        })),
      }
    })
  const frames = []
  const inputs = []
  const commits = []
  const observer = new MutationObserver(() =>
    commits.push({ time: performance.now(), state: state() }),
  )
  observer.observe(query('#snapshot'), { childList: true, subtree: true, characterData: true })
  const wait = async (predicate, stage) => {
    const start = performance.now()
    for (let attempt = 0; attempt < 180; attempt += 1) {
      frames.push({
        stage,
        time: performance.now(),
        elapsed: performance.now() - start,
        nodes: frame(),
      })
      if (predicate()) return
      await new Promise(requestAnimationFrame)
    }
    throw new Error(`Did not settle ${stage}`)
  }
  const move = (element, point) => {
    inputs.push({ time: performance.now(), target: element.id, ...point })
    element.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, clientX: point.x, clientY: point.y }),
    )
  }
  const region = query('#hover-region')
  await wait(() => state().isMeasured, 'measured')
  const first = query('#row-0')
  const firstPoint = rect(first)
  first.dispatchEvent(
    new MouseEvent('mouseover', { bubbles: true, clientX: firstPoint.x, clientY: firstPoint.y }),
  )
  region.dispatchEvent(new MouseEvent('mouseenter'))
  move(first, firstPoint)
  await wait(() => frame().length === 1 && frame()[0].opacity === 1, 'enter')
  const original = highlights()[0]
  const third = query('#row-2')
  move(third, rect(third))
  await wait(() => state().activeIndex === 2 && Math.abs(frame()[0]?.y - 168) < 0.001, 'travel')
  assert(highlights()[0] === original, 'Same session replaced its DOM node')
  const gap = { x: firstPoint.x, y: first.getBoundingClientRect().bottom + 5 }
  move(region, gap)
  await wait(() => state().activeIndex === null, 'start-exit')
  move(first, firstPoint)
  await wait(
    () =>
      state().activeIndex === 0 &&
      frame().length === 1 &&
      frame()[0].opacity === 1 &&
      frame()[0].y === 64,
    'new-session',
  )
  assert(highlights()[0] !== original, 'New session reused its previous DOM node')
  move(region, gap)
  await wait(() => state().activeIndex === null && highlights().length === 0, 'exit')
  assert(
    frames.some(
      (frame) =>
        frame.stage === 'enter' && frame.nodes.some((node) => node.opacity > 0 && node.opacity < 1),
    ),
    'No intermediate entry opacity',
  )
  assert(
    frames.some(
      (frame) =>
        frame.stage === 'travel' && frame.nodes.some((node) => node.y > 64 && node.y < 168),
    ),
    'No intermediate positional travel',
  )
  assert(
    frames.some((frame) => frame.stage === 'new-session' && frame.nodes.length === 2),
    'Exiting and entering sessions did not overlap',
  )
  assert(
    frames.some(
      (frame) =>
        frame.stage === 'exit' && frame.nodes.some((node) => node.opacity > 0 && node.opacity < 1),
    ),
    'No intermediate exit opacity',
  )
  observer.disconnect()
  return {
    status: 'passed',
    contracts: [
      'same-session identity',
      'intermediate entry/travel/exit',
      'overlapping sessions',
      'completion-driven final removal',
    ],
    inputs,
    commits,
    frames,
  }
})()
