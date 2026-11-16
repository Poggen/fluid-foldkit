import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript-api'
import { sidebarCode } from '../../app/src/playground/configs/sidebar-code.ts'
import { defaults } from '../../app/src/playground/configs/sidebar.ts'

const root = fileURLToPath(new URL('../..', import.meta.url))
const source = sidebarCode(defaults)
const parsed = ts.createSourceFile('configured-sidebar.ts', source, ts.ScriptTarget.Latest, true)
const bootstrap = parsed.statements.find(
  (statement) =>
    ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.some(
      (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === 'dialogs',
    ),
)
if (bootstrap === undefined) throw new Error('Generated Sidebar has no browser bootstrap boundary')

const preBootstrapConsumerSource = `${source.slice(0, bootstrap.getFullStart())}
import { strict as assert } from 'node:assert'
import { Story } from 'foldkit'
import { HoverBlock, test as hoverTest } from '@foldkit-visuals/fluid/hover'

const childrenConfiguration: Configuration = {
  ...defaults, l1Primary: 'menu', l1Children: true, sectionActions: 3,
}
const noActionsConfiguration: Configuration = {
  ...defaults, l1Actions: 0, l2Actions: 0, sectionActions: 0,
}
const settleRows = Story.Command.resolve(
  hoverTest.ControlHover, HoverBlock.Message.CompletedControl(),
)
await Effect.runPromise(Story.story(
  { block: HostBlock, layer: hostLayer },
  Story.init(),
  settleRows,
  Story.model((model: typeof HostBlock.Model.Type) => {
    assert.equal(model.configuredSidebar.sidebarMenus.length, 10)
  }),
  Story.messageIn(
    [ConfiguredSidebarBinding, { binding: SidebarMenus, key: 'primary-0' }],
    DropdownMenuBlock.Message.ConfiguredDisabled({ disabled: true }),
  ),
  Story.models(
    Story.steps(Story.inMessage(HostBlock.InMessage.InformedOfConfiguration({
      configuration: childrenConfiguration, presentation,
    }))),
    (before: typeof HostBlock.Model.Type, after) => {
      assert.equal(after.configuredSidebar.sidebarMenus.length, 42)
      for (const entry of before.configuredSidebar.sidebarMenus) {
        assert.equal(
          after.configuredSidebar.sidebarMenus.find(item => item.id === entry.id)?.model,
          entry.model,
        )
      }
    },
  ),
  settleRows,
  Story.models(
    Story.steps(Story.inMessage(HostBlock.InMessage.InformedOfConfiguration({
      configuration: noActionsConfiguration, presentation, intent: 'reset', edited: [],
    }))),
    (before: typeof HostBlock.Model.Type, after) => {
      assert.equal(after.configuredSidebar.sidebarMenus, before.configuredSidebar.sidebarMenus)
    },
  ),
  settleRows,
  Story.inMessage(HostBlock.InMessage.InformedOfConfiguration({ configuration: defaults, presentation })),
  Story.model((model: typeof HostBlock.Model.Type) => {
    assert.equal(model.configuredSidebar.sidebarMenus.length, 42)
    assert.equal(
      model.configuredSidebar.sidebarMenus.find(item => item.id === 'primary-0')?.model.controller.disabled,
      true,
    )
  }),
  Story.Command.expectNone(),
))
`
const verification = path.join(root, '.verification')
mkdirSync(verification, { recursive: true })
const directory = mkdtempSync(path.join(verification, 'sidebar-menu-admission-'))
const packageScope = path.join(directory, 'node_modules/@foldkit-visuals')
mkdirSync(packageScope, { recursive: true })
symlinkSync(path.join(root, 'registry/fluid'), path.join(packageScope, 'fluid'), 'dir')
const fixture = path.join(directory, 'consumer.ts')
writeFileSync(fixture, preBootstrapConsumerSource)
writeFileSync(
  path.join(directory, 'tsconfig.json'),
  JSON.stringify(
    { extends: path.join(root, 'tsconfig.base.json'), include: ['consumer.ts'] },
    null,
    2,
  ),
)
for (const command of [
  [
    path.join(root, 'node_modules/.bin/tsrs'),
    '--noEmit',
    '-p',
    path.join(directory, 'tsconfig.json'),
  ],
  ['bun', fixture],
]) {
  const result = Bun.spawnSync(command, { cwd: root, stdout: 'inherit', stderr: 'inherit' })
  if (result.exitCode !== 0)
    throw new Error(`Generated Sidebar consumer failed: ${command.join(' ')}`)
}
