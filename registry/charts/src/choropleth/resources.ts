import { inertHtml as h } from 'foldkit/html'
import type { Html, TagName } from 'foldkit/html'

export interface SvgResource {
  readonly tag: Exclude<TagName, 'textarea'>
  readonly attributes: Readonly<Record<string, string | number>>
  readonly children?: ReadonlyArray<SvgResource | string>
}

export function resourceElement(resource: SvgResource): SVGElement {
  const element = document.createElementNS('http://www.w3.org/2000/svg', resource.tag)

  for (const [name, value] of Object.entries(resource.attributes)) {
    element.setAttribute(name, String(value))
  }

  for (const child of resource.children ?? []) {
    element.append(
      typeof child === 'string' ? document.createTextNode(child) : resourceElement(child),
    )
  }

  return element
}

export function resourceHtml(resource: SvgResource): Html {
  return h.keyed(resource.tag)(
    String(resource.attributes.id ?? resource.tag),
    Object.entries(resource.attributes).map(([name, value]) => h.Attribute(name, String(value))),
    (resource.children ?? []).map((child) =>
      typeof child === 'string' ? child : resourceHtml(child),
    ),
  )
}

export function scopePatterns(
  resources: ReadonlyArray<SvgResource>,
  prefix: string,
): ReadonlyArray<SvgResource> {
  return resources.map((resource) => ({
    ...resource,
    attributes: {
      ...resource.attributes,
      ...(typeof resource.attributes.id === 'string'
        ? { id: prefix + resource.attributes.id }
        : {}),
    },
    children: (resource.children ?? []).map((child) =>
      typeof child === 'string' ? child : (scopePatterns([child], prefix)[0] ?? child),
    ),
  }))
}
