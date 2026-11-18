;(async () => {
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
  const frames = async () => {
    await frame()
    await frame()
  }
  const theme = new URLSearchParams(location.search).get('theme') ?? 'light'
  document.documentElement.className = theme
  await document.fonts.ready
  const root = () => document.querySelector('#column [data-slot="banner"]')
  for (let index = 0; index < 180 && !root(); index++) await frame()
  if (!root()) throw new Error('Missing Banner')
  if (
    root().dataset.status !== 'default' ||
    root().dataset.contrast !== 'low' ||
    root().dataset.variant !== 'inline' ||
    root().getBoundingClientRect().width < 384 ||
    getComputedStyle(root()).padding !== '16px'
  )
    throw new Error(
      `Banner fixture is not fresh: ${JSON.stringify({ status: root().dataset.status, contrast: root().dataset.contrast, variant: root().dataset.variant, width: root().getBoundingClientRect().width, padding: getComputedStyle(root()).padding, url: location.href })}`,
    )
  const click = async (id) => {
    document.getElementById(id)?.click()
    await frames()
  }
  const styles = (element) => {
    const s = getComputedStyle(element),
      r = element.getBoundingClientRect()
    return {
      tag: element.tagName,
      text: element.textContent,
      slot: element.getAttribute('data-slot'),
      role: element.getAttribute('role'),
      href: element.getAttribute('href'),
      target: element.getAttribute('target'),
      rel: element.getAttribute('rel'),
      type: element.getAttribute('type'),
      width: r.width,
      height: r.height,
      x: r.x,
      y: r.y,
      color: s.color,
      backgroundColor: s.backgroundColor,
      backgroundImage: s.backgroundImage,
      borderRadius: s.borderRadius,
      padding: s.padding,
      margin: s.margin,
      display: s.display,
      gridColumn: s.gridColumn,
      gridRow: s.gridRow,
      order: s.order,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      fontVariationSettings: s.fontVariationSettings,
      fill: s.fill,
      stroke: s.stroke,
      strokeWidth: s.strokeWidth,
      shape:
        element instanceof SVGElement
          ? [...element.attributes]
              .filter((attr) => !['class', 'style'].includes(attr.name))
              .map((attr) => [attr.name, attr.value])
              .sort()
          : null,
    }
  }
  await document.fonts.ready
  const themeTransitions = document
    .getAnimations()
    .filter((animation) => animation instanceof CSSTransition)
    .map((animation) => ({
      property: animation.transitionProperty,
      currentTime: animation.currentTime,
      duration: animation.effect?.getTiming().duration,
    }))
  for (let index = 0; index < 240; index++) {
    if (
      !document
        .getAnimations()
        .some(
          (animation) => animation instanceof CSSTransition && animation.playState === 'running',
        )
    )
      break
    if (index === 239) throw new Error('Theme transition did not settle')
    await frame()
  }
  const entries = []
  const batch = Number(new URLSearchParams(location.search).get('batch') ?? 0)
  let ordinal = 0
  const current = {
    shape: 0,
    size: 0,
    variant: 0,
    description: 0,
    width: 0,
    contrast: 0,
    icon: 0,
    status: 0,
  }

  for (let shape = 0; shape < 2; shape++)
    for (let size = 0; size < 2; size++)
      for (let variant = 0; variant < 2; variant++)
        for (let description = 0; description < 2; description++)
          for (let width = 0; width < 2; width++)
            for (let contrast = 0; contrast < 2; contrast++)
              for (let icon = 0; icon < 2; icon++)
                for (let status = 0; status < 5; status++) {
                  if (Math.floor(ordinal++ / 40) !== batch) continue
                  const desired = {
                    shape,
                    size,
                    variant,
                    description,
                    width,
                    contrast,
                    icon,
                    status,
                  }
                  for (const key of Object.keys(desired))
                    while (current[key] !== desired[key]) {
                      await click(key)
                      current[key] = key === 'status' ? (current[key] + 1) % 5 : 1 - current[key]
                    }
                  const renderedRoot = root()
                  const nodes = [renderedRoot, ...renderedRoot.querySelectorAll('*')].map(styles)
                  const hash = await crypto.subtle.digest(
                    'SHA-256',
                    new TextEncoder().encode(JSON.stringify(nodes)),
                  )
                  entries.push({
                    options: desired,
                    hash: [...new Uint8Array(hash)]
                      .map((value) => value.toString(16).padStart(2, '0'))
                      .join(''),
                    root: nodes[0],
                    ...(entries.length === 0 ? { nodes } : {}),
                  })
                }
  return {
    entries,
    theme,
    themeTransitions,
    visibility: document.visibilityState,
    focused: document.hasFocus(),
  }
})()
