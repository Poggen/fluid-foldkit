import path from 'node:path'

export const lintCommand = (root: string, arguments_: readonly string[]) => [
  path.join(root, 'node_modules/.bin/effect-tsgo'),
  '--tsrs-lint=0.21.0-ts7.1.0-beta',
  'oxlint',
  ...arguments_,
]

if (import.meta.main) {
  const root = path.resolve(import.meta.dirname, '..')
  const arguments_ = process.argv.slice(2)
  const files = arguments_.filter((argument) => !argument.startsWith('--'))
  const threads = arguments_.filter((argument) => argument.startsWith('--threads='))

  const commands = [
    [
      path.join(root, 'node_modules/.bin/oxfmt'),
      '--check',
      '--no-error-on-unmatched-pattern',
      ...threads,
      ...files,
    ],
    lintCommand(root, arguments_),
  ]

  let failed = false

  for (const command of commands) {
    try {
      const result = Bun.spawnSync(command, {
        cwd: root,
        stdin: 'inherit',
        stdout: 'inherit',
        stderr: 'inherit',
      })

      failed = result.exitCode !== 0 || failed
    } catch (error) {
      console.error(error)
      failed = true
    }
  }

  process.exitCode = failed ? 1 : 0
}
