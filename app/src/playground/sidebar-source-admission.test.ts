import { URL as NodeURL, fileURLToPath } from 'node:url'
import { expect } from 'vitest'
import { Effect } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/process'
import { NodeServices } from '@effect/platform-node'
import { it } from '@effect/vitest'

it.live(
  'copied Sidebar initializes enabled menus and retains them across later configurations',
  () =>
    Effect.gen(function* () {
      const root = fileURLToPath(new NodeURL('../../../', import.meta.url))
      const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
      const exitCode = yield* spawner.exitCode(
        ChildProcess.make('bun', ['scripts/registry/sidebar-menu-admission-consumer.ts'], {
          cwd: root,
          stdout: 'inherit',
          stderr: 'inherit',
        }),
      )
      expect(exitCode).toBe(0)
    }).pipe(Effect.timeout('120 seconds'), Effect.provide(NodeServices.layer)),
  125000,
)
