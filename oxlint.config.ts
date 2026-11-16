import { defineConfig } from 'oxlint'
import recommended from '@foldkit/oxlint-plugin/recommended.json' with { type: 'json' }
import { checkedScopedViewOverrides } from './scripts/policy/scoped-view-policy.ts'
import { prepareDesignSystemTheme } from './scripts/policy/design-system-theme.ts'
import {
  componentUseRules,
  designSystemRules,
  designSystemSettings,
} from './scripts/policy/design-system-policy.ts'

prepareDesignSystemTheme(import.meta.dirname)

const foldkitRules = (rules: Readonly<Record<string, string | undefined>>) =>
  Object.fromEntries(
    Object.entries(rules).map(([rule, severity]) => {
      if (severity !== 'error' && severity !== 'off')
        throw new Error(`Unreviewed Foldkit rule severity: ${rule}`)
      return [rule, severity] satisfies readonly [string, 'error' | 'off']
    }),
  )

const scopes = [
  'registry/fluid/src',
  'registry/charts/src',
  'registry/fluid/examples/src',
  'registry/charts/examples/src',
  'app/src',
  'lib',
]
const foldkitOverrides = scopes.flatMap((scope) => [
  { files: [`${scope}/**/*.ts`], rules: foldkitRules(recommended.rules) },
  ...recommended.overrides.map(({ files, excludeFiles, rules }) => ({
    files: files.map((file) => `${scope}/${file}`),
    ...(excludeFiles === undefined
      ? {}
      : { excludeFiles: excludeFiles.map((file) => `${scope}/${file}`) }),
    rules: foldkitRules(rules),
  })),
])

export default defineConfig({
  plugins: ['typescript', 'promise', 'unicorn'],
  categories: { correctness: 'error' },
  options: { typeAware: true },
  settings: designSystemSettings,
  ignorePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    'public/**',
    '.consumer/**',
    'docs/**',
    '**/*.bun-fixture.ts',
  ],
  jsPlugins: [
    { name: 'shadcn', specifier: '@shadcn/lint' },
    { name: 'foldkit-design', specifier: './scripts/policy/design-system-plugin.ts' },
    { name: 'foldkit', specifier: '@foldkit/oxlint-plugin' },
    { name: 'rat-stack-boundaries', specifier: './scripts/lint/boundaries.ts' },
    { name: 'rat-stack-patterns', specifier: './scripts/lint/patterns.ts' },
    { name: 'anti-slop', specifier: './scripts/lint/anti-slop/index.ts' },
    { name: 'anti-slop-effect', specifier: './scripts/lint/anti-slop/effect/index.ts' },
  ],
  rules: {
    'typescript/no-explicit-any': 'error',
    'typescript/no-non-null-assertion': 'error',
    'typescript/consistent-type-assertions': [
      'error',
      {
        assertionStyle: 'never',
      },
    ],
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'foldkit-design/no-shadowed-class': designSystemRules['foldkit-design/no-shadowed-class'],
    'anti-slop/no-chained-type-assertions': 'error',
    'anti-slop/no-widen-then-assert': 'error',
    'anti-slop/no-module-mocking': 'error',
    'anti-slop/no-reflect-apply': 'error',
    'anti-slop/no-reflect-get': 'error',
    'anti-slop-effect/no-manual-effect-error-tag': 'error',
    'rat-stack-boundaries/no-cross-layer-imports': 'error',
    'rat-stack-boundaries/no-browser-server-imports': 'error',
    'rat-stack-patterns/acquire-release-constructs-in-acquire-body': 'error',
    'rat-stack-patterns/no-module-level-mutable-state': 'error',
    'rat-stack-patterns/no-shared-pending-cache': 'error',
    'rat-stack-patterns/no-sleep-in-loop': 'error',
    'rat-stack-patterns/shared-waiters': 'error',
  },
  overrides: [
    {
      files: [...scopes, 'components/docs'].map((scope) => `${scope}/**/*.ts`),
      rules: designSystemRules,
    },
    {
      files: ['registry/*/examples/**/*.ts', 'app/src/**/*.ts'],
      rules: componentUseRules,
    },
    ...foldkitOverrides,
    ...checkedScopedViewOverrides(),
    {
      files: ['registry/fluid/test/button-mount.test.ts'],
      rules: { 'eslint/require-yield': 'off' },
    },
    {
      files: ['registry/fluid/test/pdf-worker-config.test.ts'],
      rules: { 'anti-slop/no-module-mocking': 'off' },
    },
    {
      files: ['registry/**/*.ts', 'registry/*/examples/**/*.ts', 'app/**/*.ts'],
      rules: { 'no-redeclare': 'off' },
    },
    {
      files: ['scripts/registry/**/*.ts', 'scripts/guardrails.ts'],
      env: { node: true, bun: true },
    },
    {
      files: ['registry/fluid/src/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'motion-dom',
                importNames: ['processFrame', '*'],
                message: 'Use scoped Motion APIs; do not advance the shared global frame loop.',
              },
            ],
          },
        ],
      },
    },
  ],
})
