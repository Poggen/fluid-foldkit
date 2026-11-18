;(async () => {
  const frames = async (count = 4) => {
    for (let index = 0; index < count; index++) await new Promise(requestAnimationFrame)
  }
  const read = () => {
    const button = document.querySelector('#inherited button')
    return {
      mounted: button !== null,
      height: button ? getComputedStyle(button).height : null,
      radius: button ? getComputedStyle(button).borderRadius : null,
      property: document.documentElement.style.getPropertyValue('--shape-input-radius'),
      guard: document.documentElement.classList.contains('transitioning'),
    }
  }
  const click = async (id) => {
    const button = document.getElementById(id)
    if (button === null) throw new Error(`Missing ${id}`)
    button.click()
    await frames()
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => {})),
    )
    return read()
  }
  const result = { initial: read() }
  result.shape = await click('shape')
  result.size = await click('size')
  result.pin = await click('pin')
  result.ignored = await click('size')
  result.release = await click('release')
  result.unmounted = await click('mount')
  result.remounted = await click('mount')
  return result
})()
