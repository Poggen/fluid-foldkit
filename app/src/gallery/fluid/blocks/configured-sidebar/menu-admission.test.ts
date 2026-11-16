import { it } from '@effect/vitest'
import { Effect, Option } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { DropdownMenuBlock } from '@foldkit-visuals/fluid/dropdown'
import { HoverBlock, test as hoverTest } from '@foldkit-visuals/fluid/hover'
import { componentPresentation, defaults as settings } from '../../../../settings'
import { defaults, type Configuration } from '../../../../playground/configs/sidebar'
import { ConfiguredSidebarBlock, layer, type ConfiguredSidebarModel } from './index'
import { SidebarMenus } from './bindings'
import { FinishExit } from '../../../../../../registry/fluid/src/dropdown-composition'

const subject = { block: ConfiguredSidebarBlock, layer }
const presentation = componentPresentation(settings)
const configure = (configuration: Configuration) =>
  Story.inMessage(
    ConfiguredSidebarBlock.InMessage.InformedOfConfiguration({ configuration, presentation }),
  )
const settleRows = Story.Command.resolve(
  hoverTest.ControlHover,
  HoverBlock.Message.CompletedControl(),
)
const menuChildren: Configuration = { ...defaults, l1Primary: 'menu', l1Children: true }
const noActions: Configuration = { ...defaults, l1Actions: 0, l2Actions: 0, sectionActions: 0 }

it.effect('a first configuration admits only controls that can expose a menu', () =>
  Effect.gen(function* () {
    const scenarios: ReadonlyArray<{ configuration: Configuration; count: number }> = [
      { configuration: noActions, count: 0 },
      { configuration: defaults, count: 10 },
      { configuration: menuChildren, count: 30 },
      { configuration: { ...menuChildren, sectionActions: 3 }, count: 32 },
    ]
    for (const scenario of scenarios) {
      yield* Story.story(
        subject,
        Story.init(),
        configure(scenario.configuration),
        settleRows,
        Story.model((model: ConfiguredSidebarModel) => {
          expect(model.sidebarMenus).toHaveLength(scenario.count)
          expect(new Set(model.sidebarMenus.map((entry) => entry.id)).size).toBe(scenario.count)
        }),
        Story.Command.expectNone(),
      )
    }
  }),
)

it.effect('new menu admission preserves pending row startup and existing native state', () =>
  Story.story(
    subject,
    Story.init(),
    configure(defaults),
    Story.Command.expectExact(hoverTest.ControlHover),
    Story.messageIn(
      SidebarMenus,
      'primary-0',
      DropdownMenuBlock.Message.ConfiguredDisabled({ disabled: true }),
    ),
    Story.models(
      Story.steps(
        configure({ ...defaults, sectionActions: 3 }),
        Story.inMessage(
          ConfiguredSidebarBlock.InMessage.InformedOfPresentation({
            presentation: { ...presentation, shape: 'pill', size: 'compact' },
          }),
        ),
      ),
      (before: ConfiguredSidebarModel, after) => {
        expect(after.sidebarMenus).toHaveLength(12)
        for (const entry of before.sidebarMenus)
          expect(after.sidebarMenus.find((item) => item.id === entry.id)?.model).toBe(entry.model)
        expect(after.sidebarAction).toBe(before.sidebarAction)
      },
    ),
    Story.Command.expectExact(hoverTest.ControlHover),
    settleRows,
    Story.model((model: ConfiguredSidebarModel) =>
      expect(
        model.sidebarMenus.find((item) => item.id === 'primary-0')?.model.controller.disabled,
      ).toBe(true),
    ),
    Story.Command.expectNone(),
  ),
)

it.effect('disabling menu capabilities keeps existing state and accepts later child facts', () =>
  Story.story(
    subject,
    Story.init(),
    configure(defaults),
    settleRows,
    Story.models(
      Story.steps(
        configure(noActions),
        Story.message(ConfiguredSidebarBlock.Message.UpdatedThreadSearch({ value: 'missing' })),
        Story.message(
          ConfiguredSidebarBlock.Message.ToggledSidebarSection({ id: 'primary', open: false }),
        ),
        Story.inMessage(
          ConfiguredSidebarBlock.InMessage.InformedOfConfiguration({
            configuration: noActions,
            presentation,
            intent: 'reset',
            edited: [],
          }),
        ),
      ),
      (before: ConfiguredSidebarModel, after) => {
        expect(after.sidebarMenus).toBe(before.sidebarMenus)
        expect(after.threadSearch).toBe('missing')
      },
    ),
    Story.messageIn(
      SidebarMenus,
      'primary-0',
      DropdownMenuBlock.Message.ConfiguredDisabled({ disabled: true }),
    ),
    Story.model((model: ConfiguredSidebarModel) =>
      expect(
        model.sidebarMenus.find((item) => item.id === 'primary-0')?.model.controller.disabled,
      ).toBe(true),
    ),
    Story.Command.expectNone(),
  ),
)

it.effect('a pending native exit completes after its menu capability disappears', () =>
  Story.story(
    subject,
    Story.init(),
    configure(defaults),
    settleRows,
    Story.messageIn(
      SidebarMenus,
      'primary-0',
      DropdownMenuBlock.Message.RequestedOpen({ open: true }),
    ),
    Story.messageIn(
      SidebarMenus,
      'primary-0',
      DropdownMenuBlock.Message.RequestedOpen({ open: false }),
    ),
    Story.Command.expectExact(FinishExit({ generation: 2 })),
    Story.models(Story.steps(configure(noActions)), (before: ConfiguredSidebarModel, after) => {
      expect(after.sidebarMenus).toBe(before.sidebarMenus)
      expect(
        after.sidebarMenus.find((item) => item.id === 'primary-0')?.model.controller.phase,
      ).toBe('closing')
    }),
    Story.Command.resolve(FinishExit, DropdownMenuBlock.Message.CompletedExit({ generation: 2 })),
    Story.model((model: ConfiguredSidebarModel) =>
      expect(
        model.sidebarMenus.find((item) => item.id === 'primary-0')?.model.controller.phase,
      ).toBe('absent'),
    ),
    configure(defaults),
    Story.messageIn(
      SidebarMenus,
      'primary-0',
      DropdownMenuBlock.Message.RequestedOpen({ open: true }),
    ),
    Story.model((model: ConfiguredSidebarModel) =>
      expect(
        model.sidebarMenus.find((item) => item.id === 'primary-0')?.model.controller.phase,
      ).toBe('open'),
    ),
    Story.Command.expectNone(),
  ),
)

it.effect('native selection survives enabling other menus and later configuration reset', () =>
  Story.story(
    subject,
    Story.init(),
    configure(defaults),
    settleRows,
    Story.messageIn(
      SidebarMenus,
      'primary-0',
      DropdownMenuBlock.Message.ConfiguredSelection({
        selection: { checkedIndex: Option.some(1), checkedIndices: Option.none() },
      }),
    ),
    Story.Command.expectExact(hoverTest.ControlHover),
    Story.models(
      Story.steps(
        configure({ ...defaults, sectionActions: 3 }),
        Story.inMessage(
          ConfiguredSidebarBlock.InMessage.InformedOfConfiguration({
            configuration: noActions,
            presentation,
            intent: 'reset',
            edited: [],
          }),
        ),
      ),
      (before: ConfiguredSidebarModel, after) => {
        expect(after.sidebarMenus.find((item) => item.id === 'primary-0')?.model).toBe(
          before.sidebarMenus.find((item) => item.id === 'primary-0')?.model,
        )
      },
    ),
    settleRows,
    Story.model((model: ConfiguredSidebarModel) =>
      expect(
        model.sidebarMenus.find((item) => item.id === 'primary-0')?.model.controller.checkedIndex,
      ).toEqual(Option.some(1)),
    ),
    Story.Command.expectNone(),
  ),
)
