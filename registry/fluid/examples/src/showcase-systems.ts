import type { CatalogueFamily } from './showcase-catalogue-types.js'

export const systemCatalogue: ReadonlyArray<CatalogueFamily> = [
  {
    slug: 'fluid-hover',
    name: 'Fluid Hover',
    entryPoints: ['hover', 'hover-highlight'],
    examples: [
      {
        file: 'hover.html',
        label: 'Hover examples',
      },
    ],
    exampleKind: 'focused',
    states: 'Pointer tracking, measured highlights and retained exits.',
    testOwners: [],
    note: '',
  },
  {
    slug: 'motion',
    name: 'Motion',
    entryPoints: ['motion', 'motion/target', 'motion/layout', 'tokens'],
    examples: [
      {
        file: 'svg-presence.html',
        label: 'SVG presence',
      },
      {
        file: 'reorder.html',
        label: 'Drag and shared layout',
      },
    ],
    exampleKind: 'focused',
    states: 'Target motion, retained exit and shared layout ownership.',
    testOwners: [],
    note: '',
  },
  {
    slug: 'reveal',
    name: 'Reveal',
    entryPoints: ['reveal'],
    examples: [
      {
        file: 'reveal.html',
        label: 'Reveal presets',
      },
    ],
    exampleKind: 'focused',
    states: 'The four Source reveal presets, skeleton replacement and remount.',
    testOwners: [],
    note: '',
  },
  {
    slug: 'scrollbars',
    name: 'Scrollbars',
    entryPoints: ['scroll-area'],
    examples: [
      {
        file: 'color-scroll.html',
        label: 'Scroll areas',
      },
    ],
    exampleKind: 'focused',
    states: 'Overflow, orientation, mounted scrollbars and presentation.',
    testOwners: [],
    note: '',
  },
  {
    slug: 'sizes',
    name: 'Sizes',
    entryPoints: ['presentation', 'tokens'],
    examples: [
      {
        file: 'presentation.html',
        label: 'Presentation',
      },
      {
        file: 'primitives.html',
        label: 'Button and badge sizes',
      },
    ],
    exampleKind: 'focused',
    states: 'Default and compact presentation contexts.',
    testOwners: [],
    note: '',
  },
  {
    slug: 'surfaces',
    name: 'Surfaces',
    entryPoints: ['elevated', 'tokens'],
    examples: [
      {
        file: 'presentation.html',
        label: 'Nested surfaces',
      },
    ],
    exampleKind: 'focused',
    states: 'Raised and nested surface contexts.',
    testOwners: [],
    note: '',
  },
  {
    slug: 'typography',
    name: 'Typography',
    entryPoints: ['tokens'],
    examples: [{ file: 'typography.html', label: 'Type ladder and typeset content' }],
    exampleKind: 'focused',
    states: 'Authored roles, public type scale, weights, both densities and typeset elements.',
    testOwners: [],
    note: 'Matched Source consumer available; browser acceptance remains pending.',
  },
]
