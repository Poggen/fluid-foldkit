;(async () => {
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
  const wait = async (predicate) => {
    for (let index = 0; index < 240; index++) {
      if (predicate()) return
      await frame()
    }
    throw new Error('Reveal condition deadline')
  }
  await wait(() => document.getElementById('reveal-product') !== null)
  await document.fonts.ready
  await wait(() =>
    document
      .getAnimations()
      .filter(
        (animation) =>
          animation.timeline instanceof DocumentTimeline &&
          animation.effect?.getTiming().iterations !== Infinity,
      )
      .every((animation) => animation.playState !== 'running'),
  )
  const properties = (element) => {
    const style = getComputedStyle(element)
    return {
      class: element.className,
      opacity: style.opacity,
      transform: style.transform,
      animationName: style.animationName,
      duration: style.animationDuration,
      delay: style.animationDelay,
      timing: style.animationTimingFunction,
      timeline: style.animationTimeline,
      range: style.animationRange,
      playState: style.animationPlayState,
      gridArea: style.gridArea,
      pointerEvents: style.pointerEvents,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    }
  }
  const presets = [...document.querySelectorAll('.reveal-demo')].map((element) => ({
    root: properties(element),
    children: [...element.children].map((child) => ({
      self: properties(child),
      children: [...child.children].map(properties),
    })),
  }))
  const scroll = document.getElementById('scroll-stage'),
    target = document.getElementById('entry-target')
  if (!(scroll instanceof HTMLElement) || !(target instanceof HTMLElement))
    throw new Error('Missing scroll scene')
  const scrollFrames = []
  for (const amount of [0, 300, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 1000]) {
    scroll.scrollTop = amount
    await frame()
    await frame()
    scrollFrames.push({
      scroll: scroll.scrollTop,
      target: properties(target),
      parent: properties(document.getElementById('nested-parent')),
      nested: properties(document.getElementById('nested-child')),
    })
  }
  document.getElementById('swap')?.click()
  await wait(() => document.getElementById('loaded') !== null)
  const swap = []
  for (let index = 0; index < 40; index++) {
    const time = await frame()
    swap.push({
      time,
      skeleton: properties(document.getElementById('skeleton')),
      line: properties(document.querySelector('[data-slot="skeleton"]')),
      loaded: properties(document.getElementById('loaded')),
      item: properties(document.querySelector('#loaded > :first-child')),
    })
  }
  if (swap.at(-1).skeleton.opacity !== '0') throw new Error('Skeleton did not fade out')
  if (swap.at(-1).item.opacity !== '1') throw new Error('Content did not fade in')
  return {
    supportsViewTimeline: CSS.supports('animation-timeline:view()'),
    reducedMotion: matchMedia('(prefers-reduced-motion:reduce)').matches,
    presets,
    scrollFrames,
    swap,
    visibility: document.visibilityState,
  }
})()
