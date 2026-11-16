// Adapted from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { Schema } from 'effect'

export const SystemPage = Schema.Literals([
  'fluid-hover',
  'motion',
  'reveal',
  'scrollbars',
  'sizes',
  'skill',
  'surfaces',
  'typography',
])
export type SystemPage = typeof SystemPage.Type
export const systemPages: ReadonlyArray<{
  readonly slug: SystemPage
  readonly href: string
  readonly name: string
}> = [
  { slug: 'fluid-hover', href: '/fluid-hover', name: 'Fluid Hover' },
  { slug: 'motion', href: '/motion', name: 'Motion' },
  { slug: 'reveal', href: '/reveal', name: 'Reveal' },
  { slug: 'scrollbars', href: '/scrollbars', name: 'Scrollbars' },
  { slug: 'sizes', href: '/sizes', name: 'Sizes' },
  { slug: 'skill', href: '/skill', name: 'Skill' },
  { slug: 'surfaces', href: '/surfaces', name: 'Surfaces' },
  { slug: 'typography', href: '/typography', name: 'Typography' },
]
export const systemAt = (path: string) => systemPages.find((page) => page.href === path)
