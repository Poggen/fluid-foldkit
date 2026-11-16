;(async () => {
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
  const frames = async (count) => {
    for (let index = 0; index < count; index++) await frame()
  }
  const until = async (predicate, label) => {
    for (let index = 0; index < 240; index++) {
      if (predicate()) return
      await frame()
    }
    throw new Error(`Banner lifecycle: ${label}`)
  }
  const body = () => document.querySelector('#column [data-slot="banner"]')
  const click = (id) => document.getElementById(id)?.click()
  const assert = (value, label) => {
    if (!value) throw new Error(label)
  }
  await until(() => body() !== null, 'initial')
  await document.fonts.ready
  const trace = []
  click('close')
  for (let index = 0; index < 32; index++) {
    click('status')
    const time = await frame()
    trace.push({ time, present: body() !== null })
  }
  assert(body() === null, 'parent renders must not restart close')
  click('open')
  const settled = () => {
    const element = body(),
      inner = element?.parentElement,
      row = inner?.parentElement?.parentElement
    return (
      element !== null &&
      row?.style.gridTemplateRows === '1fr' &&
      inner?.style.opacity === '1' &&
      inner?.style.transform === 'none'
    )
  }
  await until(settled, 'open settles')
  const first = body()
  const column = document.getElementById('column')
  column.style.width = '300px'
  await frames(2)
  const inner = body()?.parentElement,
    row = inner?.parentElement?.parentElement
  const resize = {
    body: body()?.getBoundingClientRect().toJSON(),
    row: row?.getBoundingClientRect().toJSON(),
  }
  assert(resize.body.height === resize.row.height, 'settled row tracks rewrapped content exactly')
  click('mount')
  await frames(2)
  assert(body() === null, 'unmount')
  click('mount')
  await frames(2)
  assert(body() !== null && body() !== first, 'remount replaces instance')
  assert(body().parentElement.style.opacity === '1', 'remount is initially in place')
  body()?.querySelector('[data-slot="banner-action"]')?.click()
  await frames(2)
  assert(
    document.getElementById('counts')?.textContent === 'Dismissals 0; Actions 1',
    'parent-owned action callback crosses registered slot',
  )
  document.querySelector('[aria-label="Close notice"]')?.click()
  await until(() => !document.querySelector('[aria-label="Close notice"]'), 'local dismiss')
  click('reopen')
  await frames(2)
  const notice = document
    .querySelector('[aria-label="Close notice"]')
    ?.closest('[data-slot="banner"]')
  assert(notice instanceof HTMLElement, 'uncontrolled reset remounts')
  assert(notice.parentElement.style.opacity === '1', 'uncontrolled reset begins at rest')
  assert(
    !document.body.textContent.includes('unrecoverable error'),
    'no crash after resource teardown',
  )
  return {
    trace,
    resize,
    counts: document.getElementById('counts')?.textContent,
    visibility: document.visibilityState,
    focused: document.hasFocus(),
  }
})()
