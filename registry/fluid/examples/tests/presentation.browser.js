;(async () => {
  await document.fonts.ready
  for (let pass = 0; pass < 4; pass++) await new Promise(requestAnimationFrame)
  await Promise.all(
    document
      .getAnimations()
      .filter((animation) => animation.effect?.getTiming().iterations !== Infinity)
      .map((animation) => animation.finished.catch(() => {})),
  )
  const fields = [
    'backgroundColor',
    'backgroundImage',
    'boxShadow',
    'borderRadius',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'width',
    'height',
    'fontSize',
    'lineHeight',
    'fontVariationSettings',
    'color',
    'fill',
    'stroke',
    'strokeWidth',
    'display',
    'gap',
  ]
  const project = (element) => {
    const style = getComputedStyle(element)
    return {
      tag: element.tagName,
      attributes: Object.fromEntries(
        [...element.attributes]
          .filter(({ name }) => !name.startsWith('data-foldkit'))
          .map(({ name, value }) => [name, value])
          .sort(),
      ),
      styles: Object.fromEntries(fields.map((name) => [name, style[name]])),
    }
  }
  const sections = Object.fromEntries(
    ['inherited', 'shape-reset', 'size-reset', 'partial-icons', 'elevated', 'nested-elevated'].map(
      (id) => {
        const root = document.getElementById(id)
        if (root === null) throw new Error(`Missing ${id}`)
        return [id, [root, ...root.querySelectorAll('*')].map(project)]
      },
    ),
  )
  const glyphs = [...document.querySelectorAll('[data-family] .glyph-cell')].map((cell) => ({
    family: cell.closest('[data-family]').getAttribute('data-family'),
    role: cell.getAttribute('data-role'),
    svg: [cell.querySelector('svg'), ...cell.querySelectorAll('svg *')].map(project),
  }))
  return {
    sections,
    glyphs,
    shapeRadius: document.documentElement.style.getPropertyValue('--shape-input-radius'),
    transitioning: document.documentElement.classList.contains('transitioning'),
  }
})()
