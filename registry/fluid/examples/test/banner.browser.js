;(async () => {
  const frames = (count) =>
    new Promise((resolve) => {
      let remaining = count
      const next = () => (--remaining <= 0 ? resolve() : requestAnimationFrame(next))
      requestAnimationFrame(next)
    })
  const until = async (predicate, label) => {
    for (let index = 0; index < 240; index++) {
      if (predicate()) return
      await frames(1)
    }
    throw new Error(`Banner deadline: ${label}`)
  }
  const click = (id) => {
    const element = document.getElementById(id)
    if (!(element instanceof HTMLElement)) throw new Error(`Missing ${id}`)
    element.click()
  }
  const body = () => document.querySelector('#column [data-slot="banner"]')
  const row = () => body()?.parentElement?.parentElement?.parentElement
  const content = () => body()?.parentElement
  const assert = (condition, label) => {
    if (!condition) throw new Error(label)
  }
  const snapshot = () => {
    const root = body()
    if (!(root instanceof HTMLElement)) return null
    const style = getComputedStyle(root),
      rect = root.getBoundingClientRect()
    return {
      status: root.dataset.status,
      contrast: root.dataset.contrast,
      variant: root.dataset.variant,
      role: root.getAttribute('role'),
      width: rect.width,
      height: rect.height,
      padding: style.padding,
      borderRadius: style.borderRadius,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      icon: root.querySelector('svg')?.outerHTML,
      title: root.querySelector('[data-slot="banner-title"]')?.getBoundingClientRect().toJSON(),
      actions: [...root.querySelectorAll('[data-slot="banner-action"]')].map((element) => ({
        tag: element.tagName,
        order: getComputedStyle(element).order,
        height: element.getBoundingClientRect().height,
        target: element.getAttribute('target'),
        rel: element.getAttribute('rel'),
      })),
    }
  }
  await until(() => body() !== null, 'initial')
  await document.fonts.ready
  const trace = []
  const input = []
  const recordInput = (event) =>
    input.push({ time: event.timeStamp, target: event.target?.id, type: event.type })
  document.addEventListener('click', recordInput, true)
  const milestones = [snapshot()]
  const controlledDismiss = body()?.querySelector('button[aria-label="Dismiss"]')
  controlledDismiss?.click()
  await frames(3)
  assert(body() !== null, 'controlled dismiss must remain open')
  assert(
    document.getElementById('counts')?.textContent === 'Dismissals 1; Actions 0',
    'controlled dismiss event',
  )
  const track = (label) =>
    new Promise((resolve) => {
      let count = 0
      const sample = (time) => {
        const root = row(),
          inner = content()
        trace.push({
          label,
          time,
          row: root?.style.gridTemplateRows,
          margin: root?.style.marginBottom,
          overflow: root?.style.overflow,
          opacity: inner === null || inner === undefined ? null : getComputedStyle(inner).opacity,
          transform: inner?.style.transform,
          pointer: inner?.style.pointerEvents,
          below: document.getElementById('below')?.getBoundingClientRect().top,
          exists: body() !== null,
        })
        if (++count < 45) requestAnimationFrame(sample)
        else resolve()
      }
      requestAnimationFrame(sample)
    })
  click('close')
  await track('close')
  assert(body() === null, 'completion removes closed banner')
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const fading = trace.filter(
      (item) => item.label === 'close' && item.exists && Number(item.opacity) < 0.5,
    )
    assert(fading.length > 0, 'observed reduced fade')
    assert(
      fading.every((item) => item.overflow === 'visible'),
      `reduced inline close preserves visible overflow: ${JSON.stringify(fading.map(({ time, opacity, overflow }) => ({ time, opacity, overflow })))}`,
    )
  }
  click('open')
  await track('open')
  assert(row()?.style.gridTemplateRows === '1fr', 'opened row reaches1fr')
  click('close')
  await frames(4)
  const identity = body()
  const before = content()?.style.transform
  click('open')
  await frames(1)
  assert(body() === identity, 'reversal retains identity')
  const after = content()?.style.transform
  await track('reverse')
  const notice = document.querySelector('[aria-label="Close notice"]')
  assert(notice instanceof HTMLButtonElement, 'uncontrolled dismiss exists')
  notice.focus()
  notice.click()
  await frames(3)
  assert(document.activeElement?.id === 'after', 'focus handed to next neighbor')
  await until(() => !document.querySelector('[aria-label="Close notice"]'), 'uncontrolled exit')
  for (const id of [
    'status',
    'contrast',
    'size',
    'shape',
    'description',
    'width',
    'icon',
    'variant',
  ]) {
    click(id)
    await frames(4)
    milestones.push(snapshot())
  }
  click('close')
  await track('fixed-close')
  click('open')
  await track('fixed-open')
  click('mount')
  await frames(3)
  assert(body() === null, 'unmounted')
  click('mount')
  await frames(3)
  assert(body() !== null, 'remounted')
  document.removeEventListener('click', recordInput, true)
  return {
    milestones,
    trace,
    input,
    reversal: { before, after },
    counts: document.getElementById('counts')?.textContent,
    visibility: document.visibilityState,
  }
})()
