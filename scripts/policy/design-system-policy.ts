import { designSystemHooks } from './design-system-hooks.ts'
import type { DummyRuleMap } from 'oxlint'

export const designSystemSettings = {
  shadcn: {
    mergeFunctions: ['h.Class', 'html.Class', 'iconHtml.Class', 'builder.Class'],
    themeImports: ['^@foldkit-visuals/'],
  },
}

export const designSystemRules = {
  'foldkit-design/no-shadowed-class': 'error',
  // A declared CSS hook whose name happens to start with Tailwind's accent utility.
  'shadcn/no-raw-colors': ['error', { allow: ['accent-swatch'] }],
  'shadcn/no-unknown-classes': [
    'error',
    {
      // These namespaces include DOM hooks consumed by chart tests and calendar adapters.
      allow: ['bkm-*', 'ts-bkm-*', 'rdp-*', 'is-*', ...designSystemHooks],
    },
  ],
  'shadcn/no-arbitrary-values': [
    'error',
    {
      allow: ['layout', 'spacing', 'typography', 'shape', 'effects', 'motion', '*var(--*'],
    },
  ],
} satisfies DummyRuleMap

export const componentUseRules = {
  'foldkit-design/use-components': 'error',
  'foldkit-design/no-restyle': 'error',
} as const
