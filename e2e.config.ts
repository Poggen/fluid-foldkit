import type { E2EConfig } from 'e2e'
import { web } from '@e2e-dev/web'
import { chatgpt } from 'e2e/oauth/chatgpt'

export default {
  tests: 'tests/exploration/**/*.e2e.ts',
  targets: [
    {
      name: 'showcase',
      engine: web({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' }),
      app: { url: 'http://127.0.0.1:5280' },
    },
  ],
  workers: 1,
  retries: 0,
  timeout: 180_000,
  actionTimeout: 5_000,
  assertionTimeout: 5_000,
  trace: 'on',
  video: 'on',
  agents: {
    default: {
      model: chatgpt('gpt-6.1-sol'),
      maxSteps: 48,
      maxModelCalls: 48,
      maxObservationBytes: 131_072,
      maxInputTokens: 24_000,
      context: [
        'This is a local native Foldkit port of Fluid Functionalism and Bklit TanStack charts. There are no accounts, backend integrations or paid actions in this showcase.',
        'Critically exercise one component page at a time. Check every authored section, interactive variant, keyboard path, control, Reset, Shuffle, Code/Preview and state preservation. Mere visible content or clickable appearance is not success: verify the expected state change.',
        'All motion must stay enabled. Read component descriptions and section captions to establish intended behavior; distinguish disabled/loading variants from broken controls. Semantic behavior and source-faithful presentation matter equally.',
        'The examples use seeded data. Lazy previews may need scrolling and a wait before becoming visible. A new-tab link leaving this tab unchanged is not itself a defect. Screenshot text split around inline tags is not broken copy.',
        'Report evidence-backed app defects with exact reproduction steps, expected versus actual and section names. Never call a budget-limited or unfinished page fully covered. Do not report missing provider credentials, dynamic text wrapping in an accessibility tree, or intentional static examples as app failures.',
        'If a normal mouse click fails but keyboard activation succeeds, investigate and report the pointer failure rather than treating the workaround as a pass. Compare behavior to the supplied component description and, when necessary, the read-only original Fluid docs at https://www.fluidfunctionalism.com/docs/<component-slug>.',
        'Native source and API props describe Foldkit rather than React. The full source view and serializable playground configuration are intentionally different contracts. Do not change application source or user configuration.',
      ].join('\n'),
    },
  },
} satisfies E2EConfig
