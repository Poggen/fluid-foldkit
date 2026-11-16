import type { Foundation } from './tailwind-policy.ts'
import { browserFoundations } from './tailwind-browser-foundations.ts'
import { exampleFoundations } from './tailwind-example-foundations.ts'

export const tailwindFoundations: readonly Foundation[] = [
  {
    file: 'registry/fluid/src/styles/tokens.css',
    owner: 'Fluid',
    reason: 'Global selection and keyboard focus defaults cover caller-authored native elements',
    utilities: ['z-sticky', 'z-overlay', 'z-modal', 'z-popover', 'z-tooltip'],
  },
  {
    file: 'registry/fluid/src/styles/typography.css',
    owner: 'Fluid',
    reason: 'Public prose composition and browser text wrapping defaults',
    utilities: ['typeset'],
  },
  {
    file: 'registry/fluid/src/styles/reveal.css',
    owner: 'Fluid',
    reason: 'Public reveal presets style consumer-authored content and state descendants',
    utilities: [
      'reveal-landing',
      'reveal-landing-subtle',
      'reveal-product',
      'reveal-product-subtle',
      'reveal-items',
      'reveal-swap',
    ],
  },
  {
    file: 'registry/fluid/src/styles/scroll-area.css',
    owner: 'Fluid',
    reason: 'Public scroll edge helpers and platform scrollbar defaults cover external content',
    utilities: ['scroll-fade', 'scroll-fade-x', 'scroll-divider', 'scrollbar-hide'],
  },
  {
    file: 'app/src/styles.css',
    owner: 'Showcase',
    reason: 'Document reset and inherited global type scale, including compact preference',
    utilities: ['text-site-body'],
  },
  {
    file: 'registry/fluid/src/styles/tabs.css',
    owner: 'Fluid',
    reason: 'Public scrollbar suppression helper supports caller-authored tab tracks',
    utilities: ['scrollbar-hide'],
  },
  ...browserFoundations,
  ...exampleFoundations,
]
