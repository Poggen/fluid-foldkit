import { eslintCompatPlugin } from '@oxlint/plugins'

import { noManualEffectErrorTagRule } from './rules/no-manual-effect-error-tag.ts'

/** Opt-in Oxlint rules for Effect service and Layer architecture. */
const antiSlopEffectPlugin = eslintCompatPlugin({
  meta: { name: 'anti-slop-effect' },
  rules: {
    'no-manual-effect-error-tag': noManualEffectErrorTagRule,
  },
})

export default antiSlopEffectPlugin
