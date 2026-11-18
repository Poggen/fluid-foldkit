import assert from 'node:assert/strict'
import { appendFileSync } from 'node:fs'
import measuredSeconds from './browser-seconds.json'

const count = Number(process.argv[2])
assert(Number.isInteger(count) && count > 0)
const listing = Bun.spawnSync(
  ['bunx', '--no-install', 'playwright', 'test', '--list', '--reporter=list'],
  {
    cwd: 'app',
    env: { ...process.env, FORCE_COLOR: '0' },
    stderr: 'inherit',
  },
)
assert.equal(listing.exitCode, 0, 'Playwright discovery failed')
const output = listing.stdout.toString()
const tests = output
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line.includes(' › '))
const total = Number(output.match(/^Total: (\d+) tests? in /mu)?.[1])
assert(
  total > 0 && tests.length === total && new Set(tests).size === total,
  'Incomplete test discovery',
)
const timings = new Map(Object.entries(measuredSeconds))
const baseline = [...timings.values()].sort((a, b) => a - b)[Math.floor(timings.size / 2)] ?? 1
const byFile = new Map<string, string[]>()
for (const test of tests) {
  const file = test.split(' › ')[0]?.replace(/:\d+:\d+$/u, '')
  assert(file && file.endsWith('.e2e.ts'), test)
  const group = byFile.get(file) ?? []
  group.push(test)
  byFile.set(file, group)
}
const groups = [...byFile]
  .flatMap(([file, members]) => {
    const seconds = timings.get(file) ?? baseline
    const groups = seconds * members.length > 60 ? members.map((member) => [member]) : [members]
    return groups.map((tests) => ({ tests, seconds: tests.length * seconds }))
  })
  .sort((a, b) => b.seconds - a.seconds)
const shards = Array.from({ length: count }, (_, i) => ({
  shard: i + 1,
  seconds: 0,
  tests: Array<string>(),
}))
for (const group of groups) {
  const lightest = shards.reduce((lightest, next) =>
    next.seconds < lightest.seconds ? next : lightest,
  )
  lightest.tests.push(...group.tests)
  lightest.seconds += group.seconds
}
const assigned = shards.flatMap((shard) => shard.tests).toSorted()
assert.deepEqual(assigned, tests.toSorted())
assert(shards.every((shard) => shard.tests.length > 0))
const matrix = JSON.stringify({
  include: shards.map(({ shard, tests }) => ({
    shard,
    count: tests.length,
    list: tests.join('\n'),
  })),
})
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${matrix}\n`)
else console.log(matrix)
