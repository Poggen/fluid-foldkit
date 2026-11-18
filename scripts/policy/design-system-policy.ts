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

  'shadcn/no-raw-colors': ['error', { allow: ['accent-swatch'] }],
  'shadcn/no-unknown-classes': [
    'error',
    {
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
