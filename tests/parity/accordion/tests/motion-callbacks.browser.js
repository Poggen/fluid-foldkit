;(async () => {
  const { Effect, Exit, Layer, Scope, createMotionScope } =
    await import('/src/motion-contract-environment.ts')
  const owned = Effect.runSync(Scope.make())
  const motion = createMotionScope('callbacks-contract')
  Effect.runSync(Layer.buildWithScope(motion.layer, owned))
  const element = document.createElement('div')
  element.style.width = '100px'
  document.body.append(element)
  const callbacks = []
  const frames = []
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
  const record = (label) => () => callbacks.push(label)
  const view = (target, label) =>
    motion.node(
      { sel: 'div', data: {}, children: [], elm: element },
      {
        initial: { opacity: 0 },
        animate: { opacity: target },
        transition: { duration: 0.2 },
        onUpdate: (values) => frames.push(values.opacity),
        onAnimationComplete: record(label),
      },
    )
  let current = view(1, 'stale')
  current.data.hook.insert(current)
  await frame()
  await frame()
  const interrupted = view(0, 'current')
  interrupted.data.hook.prepatch(current, interrupted)
  interrupted.data.hook.postpatch(current, interrupted)
  current = interrupted
  const replacement = view(0, 'replacement')
  replacement.data.hook.prepatch(current, replacement)
  replacement.data.hook.postpatch(current, replacement)
  current = replacement
  for (let index = 0; index < 180 && !callbacks.length; index += 1) await frame()
  if (callbacks.join(',') !== 'replacement')
    throw new Error('Stale/replaced completion callback ran: ' + callbacks.join(','))
  if (!frames.some((value) => value > 0 && value < 1))
    throw new Error('onUpdate omitted intermediate motion values')
  const disposing = view(1, 'disposed')
  disposing.data.hook.prepatch(current, disposing)
  disposing.data.hook.postpatch(current, disposing)
  Effect.runSync(Scope.close(owned, Exit.void))
  const before = callbacks.length
  for (let index = 0; index < 10; index += 1) await frame()
  if (callbacks.length !== before) throw new Error('Disposed scope called completion')
  element.remove()
  return {
    status: 'passed',
    callbacks,
    frames,
    contracts: [
      'actual intermediate update values',
      'generation-qualified completion',
      'callback replacement without restart',
      'disposed callback suppression',
    ],
  }
})()
