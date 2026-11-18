;(async () => {
  const assert = (value, message) => {
    if (!value) throw new Error(message)
  }
  const root = () => document.getElementById('thinking')
  const words = () => [...root().querySelectorAll('.shimmer-text:not(.invisible)')]
  const sample = () =>
    words().map((node) => ({
      text: node.textContent,
      opacity: Number(getComputedStyle(node).opacity),
      transform: getComputedStyle(node).transform,
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height,
    }))
  assert(root()?.getAttribute('role') === 'status', 'Missing status semantics')
  assert(
    root().querySelector('.sr-only')?.textContent === 'Thinking…',
    'Changing live announcement',
  )
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  const firstPath = root().querySelector('path')?.getAttribute('d')
  const start = performance.now()
  let morphed = false
  let overlap = false
  const frames = []
  while (performance.now() - start < 4700) {
    await new Promise(requestAnimationFrame)
    morphed ||= root().querySelector('path')?.getAttribute('d') !== firstPath
    const nodes = sample()
    overlap ||= nodes.length === 2
    if (nodes.length === 2 || nodes.some((node) => node.opacity > 0 && node.opacity < 1))
      frames.push({ elapsed: performance.now() - start, nodes })
    if (reduced)
      assert(nodes.length === 1 && nodes[0].text === 'Thinking', 'Reduced-motion label advanced')
    else if (nodes.length === 1 && nodes[0].text === 'Moonwalking' && nodes[0].opacity === 1) break
  }
  if (reduced) {
    assert(!morphed, 'Reduced-motion glyph morphed')
    assert(!overlap, 'Reduced-motion labels transitioned')
  } else {
    assert(morphed, 'Glyph did not morph')
    assert(overlap, 'Words did not overlap during transition')
    assert(
      sample().length === 1 && sample()[0].text === 'Moonwalking',
      'Word cycle did not complete',
    )
    assert(
      frames.some((frame) => frame.nodes.some((node) => node.opacity > 0 && node.opacity < 1)),
      'No intermediate word opacity',
    )
  }
  document.getElementById('toggle-size').click()
  for (
    let count = 0;
    count < 120 && root().querySelector('svg')?.getAttribute('width') !== '18';
    count += 1
  )
    await new Promise(requestAnimationFrame)
  assert(
    root().querySelector('svg')?.getAttribute('width') === '18',
    'Compact glyph size is incorrect',
  )
  document.getElementById('toggle-icon').click()
  for (let count = 0; count < 120 && root().querySelector('svg'); count += 1)
    await new Promise(requestAnimationFrame)
  assert(!root().querySelector('svg'), 'showIcon=false kept the glyph')
  document.getElementById('toggle-mount').click()
  for (let count = 0; count < 120 && root(); count += 1) await new Promise(requestAnimationFrame)
  assert(!root(), 'Unmount retained indicator')
  document.getElementById('toggle-mount').click()
  for (let count = 0; count < 120 && !root(); count += 1) await new Promise(requestAnimationFrame)
  assert(words()[0]?.textContent === 'Thinking', 'Remount did not reset the cycle')
  return { status: 'passed', reduced, morphed, overlap, frames, final: sample() }
})()
