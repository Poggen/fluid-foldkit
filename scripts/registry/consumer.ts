import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Schema } from 'effect'
import { families, root, release, namespaces } from './config.ts'
import { verifyBrowser } from './browser.ts'
import { writeCommandMenuConsumers } from './command-menu-consumers.ts'

const directory = mkdtempSync(path.join(tmpdir(), 'foldkit-registry-consumer-'))
const registryDirectory = path.join(directory, 'registry')
const consumer = path.join(directory, 'app')
mkdirSync(consumer)
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch(request) {
    const pathname = new URL(request.url).pathname
    const file = path.resolve(registryDirectory, `.${pathname}`)
    if (!file.startsWith(registryDirectory + path.sep) || !existsSync(file))
      return new Response('Not found', { status: 404 })
    return new Response(Bun.file(file))
  },
})
const registryOrigin = process.env.REGISTRY_CONSUMER_ORIGIN ?? server.url.origin
const run = async (command: readonly string[], cwd: string, env = process.env) => {
  const process_ = Bun.spawn([...command], { cwd, env, stdout: 'inherit', stderr: 'inherit' })
  const code = await process_.exited
  if (code !== 0) throw new Error(`Consumer command failed (${code}): ${command.join(' ')}`)
}
const ToolManifest = Schema.Struct({
  dependencies: Schema.Record(Schema.String, Schema.String),
  devDependencies: Schema.Record(Schema.String, Schema.String),
})
const Catalogue = Schema.Struct({ items: Schema.Array(Schema.Struct({ name: Schema.String })) })
try {
  if (process.env.REGISTRY_CONSUMER_ORIGIN === undefined)
    await run(['bun', 'scripts/registry/build.ts'], root, {
      ...process.env,
      REGISTRY_OUTPUT: registryDirectory,
      REGISTRY_ORIGIN: server.url.origin,
    })
  const source = Schema.decodeUnknownSync(ToolManifest)(
    JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')),
  )
  const dependencies = Object.fromEntries(
    Object.entries(source.dependencies).filter(([name]) =>
      ['effect', 'foldkit', '@foldkit/ui', '@effect/platform-browser'].includes(name),
    ),
  )
  const devDependencies = Object.fromEntries(
    ['tsrs', '@types/node', 'vite', '@foldkit/vite-plugin'].map((name) => [
      name,
      source.devDependencies[name],
    ]),
  )
  Object.assign(devDependencies, { tailwindcss: '4.1.18', '@tailwindcss/postcss': '4.1.18' })
  writeFileSync(
    path.join(consumer, 'package.json'),
    JSON.stringify(
      {
        name: 'native-registry-consumer',
        private: true,
        type: 'module',
        packageManager: 'bun@1.4.2',
        scripts: { typecheck: 'tsrs --noEmit', build: 'vite build' },
        dependencies,
        devDependencies,
      },
      null,
      2,
    ),
  )
  cpSync(path.join(root, 'tests/consumer'), consumer, { recursive: true })
  writeFileSync(
    path.join(consumer, 'components.json'),
    JSON.stringify(
      {
        $schema: 'https://ui.shadcn.com/schema.json',
        style: 'new-york',
        rsc: false,
        tsx: true,
        tailwind: { config: '', css: 'src/styles.css', baseColor: 'neutral', cssVariables: true },
        aliases: {
          components: '@/components',
          utils: '@/lib/utils',
          ui: '@/ui',
          lib: '@/lib',
          hooks: '@/hooks',
        },
        registries: Object.fromEntries(
          families.map((family) => [
            namespaces[family],
            `${registryOrigin}/r/${family}/${release}/{name}.json`,
          ]),
        ),
      },
      null,
      2,
    ),
  )
  await run(['bun', 'install', '--ignore-scripts'], consumer)
  const addresses: string[] = []
  for (const family of families) {
    const response = await fetch(`${registryOrigin}/r/${family}/${release}/registry.json`)
    if (!response.ok) throw new Error(`Registry catalogue request failed: ${response.status}`)
    const catalogue = Schema.decodeUnknownSync(Catalogue)(await response.json())
    addresses.push(
      ...catalogue.items
        .filter((item) => item.name !== 'foundation')
        .map((item) => `${namespaces[family]}/${item.name}`),
    )
  }
  await run([path.join(root, 'node_modules/.bin/shadcn'), 'add', ...addresses, '--yes'], consumer)
  const installed = Schema.decodeUnknownSync(ToolManifest)(
    JSON.parse(readFileSync(path.join(consumer, 'package.json'), 'utf8')),
  )
  for (const [name, version] of Object.entries(dependencies)) {
    if (installed.dependencies[name] !== version)
      throw new Error(`Registry changed framework version: ${name}`)
  }
  const lock = readFileSync(path.join(consumer, 'bun.lock'), 'utf8')
  if (/^    "(?:[^"]*\/)?(?:react|react-dom)":/mu.test(lock))
    throw new Error('Registry installed React')
  const commandConsumer = writeCommandMenuConsumers(consumer, 'registry')
  await run(['bun', 'run', 'typecheck'], consumer)
  const typeNegativeCases = [
    {
      label: 'bar-wrong-row',
      file: 'bar-type-contract.ts',
      code: "export const wrong = Bars.requestData({ data: [{ name: 'A', date: new Date(0), value: 'bad' }] })",
      expected: /TS2322: Type 'string' is not assignable to type 'number'/,
    },
    {
      label: 'bar-wrong-domain',
      file: 'bar-type-contract.ts',
      code: 'export const wrong: (...args: Parameters<typeof inputs.definition>) => DomChartDefinition<Parameters<typeof inputs.sourceOf>[0], Date, number> = inputs.definition',
      expected: /Type 'BarValue' is not assignable to type 'Date'/,
    },
    {
      label: 'bar-wrong-series-key',
      file: 'bar-type-contract.ts',
      code: "export const wrong = bars.inputs('bar', { children: [Bar({ dataKey: 'missing' })] })",
      expected: /TS2322:[\s\S]*Type '"missing"' is not assignable to type/,
    },
    {
      label: 'cartesian-wrong-row',
      file: 'cartesian-type-contract.ts',
      code: "export const wrong = ChartBinding.requestData({ data: [{ date: new Date(0), value: 'wrong' }] })",
      expected: /TS2322: Type 'string' is not assignable to type 'number'/,
    },
    {
      label: 'cartesian-unknown-row',
      file: 'cartesian-type-contract.ts',
      code: "export const opaqueRows = LineChart({ name: 'opaque-negative', Row: Schema.Struct({ value: Schema.Unknown }) })",
      expected: /unknown.*not assignable.*Json/s,
    },
    {
      label: 'radar-wrong-numeric-value',
      file: 'radar-funnel-type-contract.ts',
      code: "export const wrong = R.requestData({ data: [{ label: 'bad', values: { x: 'wrong' } }] })",
      expected: /TS2322: Type 'string' is not assignable to type 'number'/,
    },
  ]
  for (const test of typeNegativeCases) {
    const file = path.join(consumer, 'src', test.file)
    const positive = readFileSync(file, 'utf8')
    try {
      writeFileSync(file, `${positive}\n${test.code}\n`)
      const process_ = Bun.spawn(['bun', 'run', 'typecheck'], {
        cwd: consumer,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const [exitCode, stdout, stderr] = await Promise.all([
        process_.exited,
        new Response(process_.stdout).text(),
        new Response(process_.stderr).text(),
      ])
      const diagnostics = stdout + stderr
      assert.notEqual(exitCode, 0, `${test.label}: invalid consumer typechecked`)
      assert.ok(diagnostics.includes(test.file), `${test.label}: ${diagnostics}`)
      assert.match(diagnostics, test.expected, `${test.label}: ${diagnostics}`)
      console.log(`Rejected ${test.label} with expected diagnostic`)
    } finally {
      writeFileSync(file, positive)
    }
  }
  await run(['bun', commandConsumer.driver], consumer)
  await run(['bun', 'run', 'build'], consumer)
  mkdirSync(path.join(root, '.verification'), { recursive: true })
  const preview = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      const pathname = new URL(request.url).pathname
      const directory = path.join(consumer, 'dist')
      const file = path.resolve(directory, `.${pathname === '/' ? '/index.html' : pathname}`)
      if (!file.startsWith(directory + path.sep) || !existsSync(file))
        return new Response('Not found', { status: 404 })
      return new Response(Bun.file(file))
    },
  })
  let browser
  try {
    browser = await verifyBrowser(preview.url.href)
  } finally {
    await preview.stop(true)
  }
  writeFileSync(
    path.join(root, '.verification/consumer.json'),
    JSON.stringify(
      {
        directory: consumer,
        registryOrigin,
        itemsInstalled: addresses.length,
        frameworkVersionsPreserved: true,
        reactInstalled: false,
        typecheck: 'passed',
        typeNegativeCases: typeNegativeCases.length,
        typeNegativeCaseLabels: typeNegativeCases.map((test) => test.label),
        productionBuild: 'passed',
        browser,
      },
      null,
      2,
    ) + '\n',
  )
  console.log(
    `All ${addresses.length} registry entries installed and checked in independent consumer: ${consumer}`,
  )
} finally {
  await server.stop(true)
}
