import { componentPages } from '../../../lib/catalogue'

const knownHrefs = new Set(componentPages.map((page) => page.href))
export const isPreviewHref = (href: string) => knownHrefs.has(href)
