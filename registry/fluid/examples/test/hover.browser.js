// oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
/** @param {boolean} value @param {string} message */
const assert = (value, message) => {
  if (!value) {
    throw new Error(message)
  }
}

// oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
/** @param {string} selector */
const query = (selector) => {
  const element = document.querySelector(selector)

  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing ${selector}`)
  }

  return element
}

// oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
/** @returns {Promise<void>} */
const nextFrame = async () => {
  // oxlint-disable-next-line landmines-style/no-comments -- Required compiler JSDoc directive.
  /** @type {Promise<void>} */
  const pendingFrame = new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve()
    })
  })

  await pendingFrame
}

// oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
/** @param {string} name */
const button = (name) => {
  const element = [...document.querySelectorAll('.toolbar button')].find(
    (candidate) => candidate.textContent === name,
  )

  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Missing ${name}`)
  }

  element.click()
}

// oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
/** @param {HTMLElement} target @param {number} x @param {number} y */
const move = (target, x, y) =>
  target.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }))

// oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
/** @param {HTMLElement} target */
const center = (target) => {
  const rect = target.getBoundingClientRect()

  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/** @param {typeof import('../observations/hover-observation.js').decodeSnapshot} decodeSnapshot */
export const runHover = async (decodeSnapshot) => {
  const snapshot = () => decodeSnapshot(query('#snapshot').textContent)

  // oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
  /** @param {(state: import('../observations/hover-observation.js').ObservedHover) => boolean} predicate */
  const isReady = (predicate) => {
    const state = snapshot()

    if (!predicate(state)) {
      return false
    }

    const region = document.querySelector('#hover-region')

    if (!(region instanceof HTMLElement)) {
      return false
    }

    const marked = [...region.querySelectorAll('[data-fluid-hover-active]')].map((element) =>
      Number(element.id.slice('row-'.length)),
    )

    return (
      (region.dataset.fluidHoverActiveIndex ?? null) ===
        (state.activeIndex === null ? null : String(state.activeIndex)) &&
      JSON.stringify(marked) ===
        JSON.stringify(state.activeIndex === null ? [] : [state.activeIndex])
    )
  }

  // oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
  /** @param {() => boolean} predicate @param {string} label */
  const wait = async (predicate, label) => {
    for (let frame = 0; frame < 180; frame += 1) {
      if (predicate()) {
        return
      }

      await nextFrame()
    }

    throw new Error(`No ${label}: ${JSON.stringify(snapshot())}`)
  }

  // oxlint-disable-next-line landmines-style/no-comments -- Required compiler JSDoc directive.
  /** @type {(import('../observations/hover-observation.js').ObservedHover & { name: string, count: number })[]} */
  const traces = []

  // oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
  /** @param {string} name */
  const record = (name) => {
    const state = snapshot()

    const region = document.querySelector('#hover-region')

    if (region === null) {
      assert(name === 'unmounted', 'Missing #hover-region')
    } else {
      if (!(region instanceof HTMLElement)) {
        throw new Error('Invalid #hover-region element')
      }

      assert(
        (region.dataset.fluidHoverActiveIndex ?? null) ===
          (state.activeIndex === null ? null : String(state.activeIndex)),
        'Container active attribute differs from the rendered state',
      )

      const marked = [...region.querySelectorAll('[data-fluid-hover-active]')].map((element) =>
        Number(element.id.slice('row-'.length)),
      )

      assert(
        JSON.stringify(marked) ===
          JSON.stringify(state.activeIndex === null ? [] : [state.activeIndex]),
        'Item active attributes differ from the rendered state',
      )
    }

    traces.push({
      name,
      ...state,
      count: Number(query('#count').textContent),
    })
  }

  const region = query('#hover-region')

  // oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
  /** @param {number} index */
  const row = (index) => query(`#row-${index}`)

  await wait(() => isReady((state) => state.isMeasured), 'initial measurement')

  record('measured')

  const first = center(row(0))

  row(0).dispatchEvent(
    new MouseEvent('mouseover', { bubbles: true, clientX: first.x, clientY: first.y }),
  )

  region.dispatchEvent(new MouseEvent('mouseenter'))

  move(row(0), first.x, first.y)

  await wait(() => isReady((state) => state.activeIndex === 0), 'first row')

  record('direct-first')

  const gap = { x: first.x, y: row(0).getBoundingClientRect().bottom + 5 }

  move(region, gap.x, gap.y)

  await wait(() => isReady((state) => state.activeIndex === null), 'empty gap')

  record('direct-gap')

  const third = center(row(2))

  move(row(2), third.x, third.y)

  await wait(() => isReady((state) => state.activeIndex === 2), 'third row')

  record('direct-third-new-session')

  const burstSession = snapshot().session

  for (const index of [1, 2, 0]) {
    const point = center(row(index))

    move(row(index), point.x, point.y)
  }

  await wait(() => isReady((state) => state.activeIndex === 0), 'coalesced latest pointer')

  assert(snapshot().session === burstSession, 'A coalesced move changed the session')

  record('coalesced-latest-pointer')

  button('Nearest')

  await nextFrame()

  await nextFrame()

  move(region, gap.x, gap.y)

  await wait(() => isReady((state) => state.activeIndex === 0), 'nearest gap')

  record('nearest-gap')

  region.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: gap.x, clientY: gap.y }))

  await wait(() => isReady(() => Number(query('#count').textContent) === 1), 'gap activation')

  record('gap-click-once')

  const disabled = center(row(3))

  move(row(3), disabled.x, disabled.y)

  await wait(() => isReady((state) => state.activeIndex === 2), 'skip disabled row')

  record('nearest-skips-disabled')

  const outside = region.getBoundingClientRect()

  region.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      clientX: outside.left + 10,
      clientY: outside.bottom - 3,
    }),
  )

  query('input').click()

  await nextFrame()

  assert(Number(query('#count').textContent) === 1, 'Distant or gap control click activated row')

  record('click-guards')

  region.style.transform = 'scale(0.8)'

  region.style.transformOrigin = 'top left'

  const scaled = center(row(1))

  move(region, scaled.x, scaled.y)

  await wait(() => isReady((state) => state.activeIndex === 1), 'scaled coordinates')

  record('scaled-nearest')

  button('Highlight third')

  await wait(() => isReady((state) => state.activeIndex === 2), 'programmatic highlight')

  button('Filter middle')

  await wait(
    () =>
      isReady(
        (state) =>
          state.isMeasured &&
          state.itemRects.entries.every((entry) => entry.index !== 1) &&
          state.itemRects.entries.find((entry) => entry.index === 2)?.rect.top === 116,
      ),
    'sparse reordered measurement',
  )

  record('sparse-reflow')

  button('Clear')

  await wait(() => isReady((state) => state.activeIndex === null), 'programmatic clear')

  record('clear')

  const pending = center(row(0))

  move(row(0), pending.x, pending.y)

  region.dispatchEvent(new MouseEvent('mouseleave'))

  region.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }))

  await nextFrame()

  await nextFrame()

  assert(snapshot().activeIndex === null, 'A queued move survived leaving the container')

  record('leave-cancels-queued-move')

  button('Toggle mount')

  await wait(() => !document.querySelector('#hover-region') && !snapshot().isMeasured, 'unmount')

  record('unmounted')

  button('Toggle mount')

  await wait(
    () => isReady((state) => document.querySelector('#hover-region') !== null && state.isMeasured),
    'remount',
  )

  record('remounted')

  return { status: 'passed', traces }
}
