;(async () => {
  await document.fonts.ready
  const cases = [...document.querySelectorAll('.icon-case')]
  if (cases.length !== 179)
    throw new Error(`Expected 59 roles at 3 sizes plus 2 override cases, got ${cases.length}`)
  const attrs = (element) =>
    Object.fromEntries(
      [...element.attributes]
        .map((attribute) => [attribute.name, attribute.value])
        .sort(([a], [b]) => a.localeCompare(b)),
    )
  return {
    status: 'passed',
    cases: cases.map((element) => {
      const svg = element.querySelector('svg')
      if (!(svg instanceof SVGSVGElement) || svg.getAttribute('aria-hidden') !== 'true')
        throw new Error(`Invalid decorative SVG ${element.dataset.case}`)
      const rect = svg.getBoundingClientRect()
      return {
        name: element.dataset.case,
        width: rect.width,
        height: rect.height,
        attributes: attrs(svg),
        nodes: [...svg.children].map((node) => ({ tag: node.tagName, attributes: attrs(node) })),
      }
    }),
  }
})()
