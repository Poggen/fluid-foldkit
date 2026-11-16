import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'

const clone = path.resolve(process.env.FOLDKIT_DOMAINS_REFERENCE ?? '.references/foldkit-domains')
const git = (...args: readonly string[]) => {
  const result = Bun.spawnSync(['git', '-C', clone, ...args], { stdout: 'pipe', stderr: 'pipe' })
  assert.equal(result.exitCode, 0, result.stderr.toString())
  return result.stdout.toString().trim()
}
export const verifyDomainsReference = () => {
  assert.equal(git('remote', 'get-url', 'origin'), 'https://github.com/foldkit/foldkit-domains.git')
  assert.equal(git('rev-parse', 'HEAD'), '039c941ad42c9db46d1aa8014c770c9a841c75ad')
  assert.equal(git('status', '--porcelain'), '')
  for (const file of [
    'src/client/model.ts',
    'src/client/domainsQuery.ts',
    'src/client/composition.ts',
    'src/client/block.ts',
    'src/client/layer.ts',
    'src/client/command.ts',
    'src/client/steps/domainRequests.ts',
    'src/client/steps/search.ts',
    'src/client/searchViewState.ts',
    'src/shared/domainsRpc.ts',
    'src/client/rpc.ts',
    'src/client/entry.ts',
    'src/server/rpc.ts',
    'src/client/domainsQuery.test.ts',
    'src/client/story/test.ts',
    'src/client/story/cachedDomains.story.test.ts',
    '.oxlintrc.json',
    'docs/framework-preview.md',
  ])
    assert(existsSync(`${clone}/${file}`), `Missing pinned source ${file}`)
  console.log(`Pinned Domains checkout verified: ${clone}`)
}

if (import.meta.main) {
  if (!existsSync(clone)) {
    const result = Bun.spawnSync(
      ['git', 'clone', '--no-checkout', 'https://github.com/foldkit/foldkit-domains.git', clone],
      {
        stdout: 'inherit',
        stderr: 'inherit',
      },
    )
    assert.equal(result.exitCode, 0, 'Domains clone failed')
    git('checkout', '--detach', '039c941ad42c9db46d1aa8014c770c9a841c75ad')
  }
  verifyDomainsReference()
}
