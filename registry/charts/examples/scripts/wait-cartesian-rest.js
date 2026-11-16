;(async () => {
  await document.fonts.ready
  let previous = ''
  let stableFrames = 0
  for (let frame = 0; frame < 1800; frame++) {
    await new Promise(window.chartFrameObservation.request)
    const fixture = document.querySelector('#bar-fixture')
    const svg = fixture?.querySelector('svg.ts-chart')
    const tooltip = fixture?.querySelector('.ts-chart-tooltip')
    const tooltipMoving =
      tooltip && !tooltip.hidden && getComputedStyle(tooltip).translate !== 'none'
    const activeAnimation = document
      .getAnimations()
      .some(
        (animation) =>
          animation.playState === 'running' &&
          animation.effect?.getComputedTiming().iterations !== Infinity,
      )
    const overlay = [...(fixture?.querySelectorAll('.bkm-hov *') ?? [])]
      .map((element) => element.getAttribute('style'))
      .join('|')
    // Engine tooltip movement and overlay glides use RAF springs, outside WAAPI.
    const moving =
      window.chartFrameObservation.snapshot().pending.length > 0 ||
      !fixture?.querySelector('[data-bkm-ready]') ||
      !svg ||
      svg.getAttribute('data-ts-motion-state') === 'running' ||
      tooltipMoving ||
      activeAnimation ||
      overlay !== previous
    stableFrames = moving ? 0 : stableFrames + 1
    previous = overlay
    if (stableFrames === 4)
      return { frame, stableFrames, ...window.chartFrameObservation.snapshot() }
  }
  throw Error('Cartesian motion did not reach observable rest')
})()
