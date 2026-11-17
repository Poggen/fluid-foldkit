import { cn } from '../lib/utils.js'

const SVG = 'http://www.w3.org/2000/svg'
const XLINK = 'http://www.w3.org/1999/xlink'
const renderingLinks = new Set([
  'use',
  'image',
  'feImage',
  'textPath',
  'linearGradient',
  'radialGradient',
  'pattern',
  'filter',
])

export function updatePreviousLabelPresentation(previous: HTMLElement, destination: HTMLElement) {
  const className = cn(
    destination.className,
    'pointer-events-none absolute left-1/2 top-1/2 w-max -translate-x-1/2 -translate-y-1/2',
  )
  if (previous.className !== className) previous.className = className
}

/** Keep SVG paint definitions private to this one inert capture, including after source removal. */
export function capturePreviousLabel(
  source: HTMLElement,
  destination: HTMLElement,
  prefix: string,
): HTMLElement {
  const clone = destination.cloneNode(false)
  if (!(clone instanceof HTMLElement)) throw new Error('Tooltip label capture requires HTML')
  clone.append(...Array.from(source.childNodes, (node) => node.cloneNode(true)))
  const nodes = [clone, ...clone.querySelectorAll('*')]
  const ids = new Map<string, string>()
  let index = 0
  for (const node of nodes) {
    const id = node.getAttribute('id')
    if (id !== null) {
      node.removeAttribute('id')
      if (node.namespaceURI === SVG && !ids.has(id)) {
        let next: string
        do {
          next = `${prefix}-svg-${index++}`
        } while (source.ownerDocument.getElementById(next) !== null)
        ids.set(id, next)
        node.setAttribute('id', next)
      }
    }
  }
  const fragment = (value: string) =>
    value.startsWith('#') ? `#${ids.get(value.slice(1)) ?? value.slice(1)}` : value
  const urls = (value: string) =>
    value.replace(
      /url\(\s*(["']?)#([^"')\s]+)\1\s*\)/g,
      (whole: string, quote: string, id: string) => {
        const next = ids.get(id)
        return next === undefined ? whole : `url(${quote}#${next}${quote})`
      },
    )
  for (const node of nodes) {
    node.removeAttribute('autofocus')
    node.removeAttribute('name')
    node.removeAttribute('data-tooltip-label')
    node.removeAttribute('contenteditable')
    const renderLink = node.namespaceURI === SVG && renderingLinks.has(node.localName)
    if (!renderLink) {
      node.removeAttribute('href')
      node.removeAttribute('xlink:href')
      node.removeAttributeNS(XLINK, 'href')
    }
    for (const attribute of Array.from(node.attributes)) {
      if (attribute.name.startsWith('on') || attribute.name.startsWith('aria-')) {
        node.removeAttributeNode(attribute)
        continue
      }
      const value =
        renderLink && (attribute.localName === 'href' || attribute.name === 'xlink:href')
          ? fragment(attribute.value)
          : urls(attribute.value)
      if (value !== attribute.value) {
        if (attribute.namespaceURI === null) node.setAttribute(attribute.name, value)
        else node.setAttributeNS(attribute.namespaceURI, attribute.name, value)
      }
    }
    if (node.namespaceURI === SVG && node.localName === 'style')
      node.textContent = urls(node.textContent ?? '')
    if (node instanceof HTMLElement) node.tabIndex = -1
  }
  clone.inert = true
  clone.setAttribute('aria-hidden', 'true')
  clone.dataset.tooltipPrevious = ''
  updatePreviousLabelPresentation(clone, destination)
  clone.style.opacity = '1'
  return clone
}
