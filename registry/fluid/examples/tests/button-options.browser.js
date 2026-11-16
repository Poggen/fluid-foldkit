;(async () => {
  const assert = (value, message) => {
    if (!value) throw new Error(message)
  }
  const query = (id) => {
    const element = document.getElementById(id)
    assert(element instanceof HTMLElement, `Missing ${id}`)
    return element
  }
  const state = () => JSON.parse(query('result').textContent)
  const wait = async (clicks, submissions) => {
    for (let frame = 0; frame < 120; frame += 1) {
      if (state().clicks === clicks && state().submissions === submissions) return
      await new Promise(requestAnimationFrame)
    }
    throw new Error(`Unexpected ${JSON.stringify(state())}, wanted ${clicks}/${submissions}`)
  }
  const observations = []
  const record = (id) => {
    const element = query(id)
    observations.push({
      id,
      tag: element.tagName,
      type: element.getAttribute('type'),
      role: element.getAttribute('role'),
      disabled: element.hasAttribute('disabled'),
      dataDisabled: element.hasAttribute('data-disabled'),
      tabIndex: element.tabIndex,
      state: state(),
    })
  }
  query('button-default').click()
  await wait(1, 0)
  record('button-default')
  query('button-submit').click()
  await wait(2, 1)
  record('button-submit')
  for (const family of ['button']) {
    query(`${family}-disabled`).click()
    query(`${family}-loading-default`).click()
    record(`${family}-disabled`)
    record(`${family}-loading-default`)
    const busy = query(`${family}-loading-default`)
    assert(busy.getAttribute('aria-busy') === 'true', 'Loading button lost busy semantics')
    assert(getComputedStyle(busy).opacity === '1', 'Loading button is dimmed')
    const spinner = busy.querySelector('svg:has(circle[pathLength="100"])')
    assert(
      spinner?.getAttribute('viewBox') === '0 0 16 16' && spinner?.getAttribute('width') === '16',
      'Loading spinner geometry differs',
    )
  }
  await new Promise(requestAnimationFrame)
  assert(state().clicks === 2 && state().submissions === 1, 'Disabled/loading button activated')
  for (const [index, family] of ['button'].entries()) {
    const link = query(`${family}-link`)
    assert(link instanceof HTMLAnchorElement, 'Custom root lost link semantics')
    assert(
      !link.hasAttribute('disabled') && !link.hasAttribute('role'),
      'Link gained button semantics',
    )
    link.click()
    await wait(3 + index, 1)
    record(`${family}-link`)
  }
  const aliases = {
    sm: 'compact',
    md: 'default',
    lg: 'default',
    'icon-sm': 'icon-compact',
    'icon-lg': 'icon',
  }
  const boxes = []
  for (const family of ['button'])
    for (const [alias, canonical] of Object.entries(aliases)) {
      const a = query(`${family}-plain-${alias}`).getBoundingClientRect()
      const c = query(`${family}-plain-${canonical}`).getBoundingClientRect()
      assert(a.width === c.width && a.height === c.height, `Alias ${alias} geometry differs`)
      boxes.push({ family, alias, canonical, width: a.width, height: a.height })
    }
  const spinnerAnimations = document
    .getAnimations()
    .filter(
      (animation) =>
        animation.effect instanceof KeyframeEffect &&
        animation.effect.target?.closest('[id*="-loading-"]'),
    )
    .map((animation) => ({
      name: animation.animationName,
      timing: animation.effect.getTiming(),
      frames: animation.effect.getKeyframes(),
    }))
  assert(spinnerAnimations.length === 18, 'Spinner animations missing')
  return { status: 'passed', observations, boxes, spinnerAnimations }
})()
