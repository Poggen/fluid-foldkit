import { it } from '@effect/vitest'
import { Array, Effect, Option, Tuple } from 'effect'
import { Story } from 'foldkit'
import { expect } from 'vitest'
import { BannerBlock, test as bannerTest } from '@foldkit-visuals/fluid/banner'
import { ColorPickerBlock, colorValueOf } from '@foldkit-visuals/fluid/color-picker'
import { HoverBlock, test as hoverTest } from '@foldkit-visuals/fluid/hover'
import { NavMenuBlock } from '@foldkit-visuals/fluid/nav-menu'
import { SidebarBlock } from '@foldkit-visuals/fluid/sidebar'
import { componentPresentation, defaults as settings } from '../../../../settings'
import { defaults, type Configuration } from '../../../../playground/configs/sidebar'
import { defaults as buttonDefaults } from '../../../../playground/configs/button'
import { acceptConfiguration } from '../../../../playground/configuration-acceptance'
import { prepareGalleryFlags } from '../../../flags'
import { FluidGalleryBlock, layer as fluidLayer } from '../../index'
import { ConfiguredSidebarBinding } from '../../configured-sidebar-binding'
import type { FluidGalleryModel } from '../../block'
import { Color } from '../../details-bindings'
import { Sidebar as LandingSidebar, Threads as LandingThreads } from '../../interactive-bindings'
import { ConfiguredSidebarBlock, layer, isOpen, type ConfiguredSidebarModel } from './index'
import { Sidebar, Threads } from './bindings'

const subject = { block: ConfiguredSidebarBlock, layer }
const gallery = { block: FluidGalleryBlock, layer: fluidLayer }
const configuredSidebar = (model: FluidGalleryModel) => {
  if (Option.isNone(model.configuredSidebar)) throw new Error('Expected configured sidebar')
  return model.configuredSidebar.value
}
const settleGallery = () =>
  Story.Command.resolve(
    bannerTest.CaptureReducedMotion,
    BannerBlock.Message.CapturedReducedMotion({ value: false, mountGeneration: 0 }),
  )
const presentation = componentPresentation(settings)
const configure = (configuration: Configuration = defaults, edited?: ReadonlyArray<string>) =>
  Story.inMessage(
    ConfiguredSidebarBlock.InMessage.InformedOfConfiguration({
      configuration,
      presentation,
      ...(edited === undefined ? {} : { edited }),
    }),
  )
const settleNavigation = (count: number) =>
  Story.Command.resolveAllExact(
    ...Array.makeBy(count, () =>
      Tuple.make(hoverTest.ControlHover, HoverBlock.Message.CompletedControl()),
    ),
  )

it.effect('admits enabled menu owners once and retains them through every action count', () =>
  Story.story(
    subject,
    Story.init(),
    Story.model((model: ConfiguredSidebarModel) => expect(model.sidebarMenus).toEqual([])),
    configure(),
    settleNavigation(1),
    Story.model((model: ConfiguredSidebarModel) => {
      expect(model.sidebarMenus).toHaveLength(10)
      expect(new Set(model.sidebarMenus.map((entry) => entry.id)).size).toBe(10)
    }),
    Story.models(
      Story.steps(
        configure({ ...defaults, appearance: { ...defaults.appearance } }, []),
        Story.Command.expectNone(),
      ),
      (before: ConfiguredSidebarModel, after) => {
        expect(after.threads).toBe(before.threads)
        expect(after.sidebarHeaderActions).toBe(before.sidebarHeaderActions)
        expect(after.sidebarFooterActions).toBe(before.sidebarFooterActions)
      },
    ),
    configure({ ...defaults, l1Primary: 'menu', l1Children: true, sectionActions: 3 }),
    settleNavigation(1),
    Story.model((model: ConfiguredSidebarModel) => expect(model.sidebarMenus).toHaveLength(42)),
    configure(),
    settleNavigation(1),
    Story.models(
      Story.steps(
        ...([0, 1, 2] as const).map((count) =>
          Story.steps(
            configure({ ...defaults, headerActions: count, footerActions: count }),
            settleNavigation(2),
            Story.model((model: ConfiguredSidebarModel) => {
              expect(model.sidebarHeaderActions.items).toHaveLength(count)
              expect(model.sidebarFooterActions.items).toHaveLength(count)
            }),
          ),
        ),
        ...([0, 1, 2, 3] as const).map((count) =>
          configure({
            ...defaults,
            headerActions: 2,
            footerActions: 2,
            sectionActions: count,
            l1Actions: count,
            l2Actions: count,
          }),
        ),
      ),
      (before: ConfiguredSidebarModel, after) => {
        expect(after.sidebarMenus).toBe(before.sidebarMenus)
        for (const [index, entry] of before.sidebarMenus.entries())
          expect(after.sidebarMenus[index]?.model).toBe(entry.model)
      },
    ),
    Story.Command.expectNone(),
  ),
)

it.effect(
  'reset restores disclosure and callouts while retaining search, measurement and selection',
  () => {
    const configuration: Configuration = { ...defaults, l1Primary: 'menu', l1Children: true }
    return Story.story(
      subject,
      Story.init(),
      configure(configuration),
      settleNavigation(1),
      Story.message(ConfiguredSidebarBlock.Message.UpdatedThreadSearch({ value: 'Home' })),
      Story.message(ConfiguredSidebarBlock.Message.MeasuredSidebarCallout({ height: 96 })),
      Story.message(ConfiguredSidebarBlock.Message.MeasuredSidebarCallout({ height: 0 })),
      Story.message(ConfiguredSidebarBlock.Message.HoveredSidebarCallouts({ hovered: true })),
      Story.message(
        ConfiguredSidebarBlock.Message.ToggledSidebarSection({ id: 'primary', open: false }),
      ),
      Story.message(ConfiguredSidebarBlock.Message.UpdatedSidebarAction({ action: 'New' })),
      Story.messageIn(Threads, NavMenuBlock.Message.Selected({ value: 'primary-0', href: '#' })),
      Story.messageIn(
        Threads,
        NavMenuBlock.Message.Selected({ value: 'primary-0-child-0', href: '#' }),
      ),
      settleNavigation(1),
      Story.message(ConfiguredSidebarBlock.Message.DismissedSidebarCallout({ id: 'sidebar' })),
      Story.model((model: ConfiguredSidebarModel) => {
        expect(model.sidebarExpanded['primary-0']).toBe(true)
        expect(model.sidebarCalloutPresence[0]?.model.phase).toBe('Exiting')
        expect(model.sidebarDismissedCallouts).toEqual(['sidebar'])
      }),
      Story.models(
        Story.steps(
          Story.inMessage(
            ConfiguredSidebarBlock.InMessage.InformedOfConfiguration({
              configuration,
              presentation,
              intent: 'reset',
              edited: [],
            }),
          ),
        ),
        (before: ConfiguredSidebarModel, after) => {
          expect(after.sidebarSections).toEqual({ primary: true, secondary: true })
          expect(after.sidebarExpanded).toEqual({})
          expect(after.sidebarAction).toBe('')
          expect(after.sidebarDismissedCallouts).toEqual([])
          expect(after.sidebarCalloutPresence[0]?.model.phase).toBe('Present')
          expect(after.threadSearch).toBe('Home')
          expect(after.sidebarCalloutHeight).toBe(96)
          expect(after.sidebarCalloutsHovered).toBe(true)
          expect(after.threads).toBe(before.threads)
          expect(after.sidebarMenus).toBe(before.sidebarMenus)
        },
      ),
      Story.Command.expectNone(),
    )
  },
)

it.effect(
  'global and appearance hover reach all owners without reopening a user-closed shell',
  () =>
    Story.story(
      subject,
      Story.init(),
      configure(),
      settleNavigation(1),
      Story.messageIn(Sidebar, SidebarBlock.Message.Toggled()),
      Story.inMessage(
        ConfiguredSidebarBlock.InMessage.InformedOfPresentation({
          presentation: { ...presentation, hover: 'standard' },
        }),
      ),
      Story.model((model: ConfiguredSidebarModel) => {
        expect(isOpen(model)).toBe(false)
        for (const child of [
          model.sidebarWorkspace,
          model.sidebarUser,
          model.threads,
          model.sidebarHeaderActions,
          model.sidebarFooterActions,
          model.sidebarCallouts,
          ...model.sidebarMenus.map((entry) => entry.model),
        ])
          expect(child.hover.mode).toBe('standard')
      }),
      Story.inMessage(
        ConfiguredSidebarBlock.InMessage.InformedOfConfiguration({
          configuration: { ...defaults, appearance: { hover: 'fluid' } },
          presentation: { ...presentation, hover: 'standard' },
          edited: ['appearance'],
          intent: 'edit',
        }),
      ),
      Story.model((model: ConfiguredSidebarModel) => {
        expect(isOpen(model)).toBe(false)
        for (const child of [
          model.sidebarWorkspace,
          model.sidebarUser,
          model.threads,
          model.sidebarHeaderActions,
          model.sidebarFooterActions,
          model.sidebarCallouts,
          ...model.sidebarMenus.map((entry) => entry.model),
        ])
          expect(child.hover.mode).toBe('fluid')
      }),
      configure(defaults, []),
      Story.model((model: ConfiguredSidebarModel) => expect(isOpen(model)).toBe(false)),
      configure({ ...defaults, state: 'loading' }, ['state']),
      Story.model((model: ConfiguredSidebarModel) => expect(isOpen(model)).toBe(true)),
      Story.Command.expectNone(),
    ),
)

it.effect(
  'keeps landing controllers independent while accepting configured shell open changes',
  () =>
    Effect.gen(function* () {
      const flags = yield* prepareGalleryFlags
      const beforeConfigured = yield* Story.story(
        gallery,
        Story.init(flags),
        settleGallery(),
        Story.inMessage(
          FluidGalleryBlock.InMessage.InformedOfConfiguration({
            configuration: defaults,
            presentation,
          }),
        ),
        settleNavigation(1),
        Story.message(FluidGalleryBlock.Message.UpdatedThreadSearch({ value: 'Landing draft' })),
      )
      const afterConfigured = yield* Story.story(
        gallery,
        Story.given(beforeConfigured),
        Story.messageIn(
          ConfiguredSidebarBinding,
          ConfiguredSidebarBlock.Message.UpdatedThreadSearch({ value: 'Configured draft' }),
        ),
        Story.messageIn(
          [ConfiguredSidebarBinding, Threads],
          NavMenuBlock.Message.Selected({ value: 'primary-0', href: '#' }),
        ),
        settleNavigation(1),
      )
      expect(afterConfigured.threadSearch).toBe('Landing draft')
      expect(afterConfigured.threads).toBe(beforeConfigured.threads)
      expect(afterConfigured.sidebar).toBe(beforeConfigured.sidebar)
      expect(afterConfigured.sidebarWorkspace).toBe(beforeConfigured.sidebarWorkspace)
      expect(afterConfigured.sidebarUser).toBe(beforeConfigured.sidebarUser)
      expect(configuredSidebar(afterConfigured).threadSearch).toBe('Configured draft')

      const afterLanding = yield* Story.story(
        gallery,
        Story.given(afterConfigured),
        Story.messageIn(LandingThreads, NavMenuBlock.Message.Selected({ value: '0', href: '#' })),
        settleNavigation(1),
      )
      expect(afterLanding.configuredSidebar).toBe(afterConfigured.configuredSidebar)

      const retained = yield* Story.story(
        gallery,
        Story.given(afterLanding),
        Story.inMessage(FluidGalleryBlock.InMessage.InformedOfPresentation({ presentation })),
        Story.inMessage(
          FluidGalleryBlock.InMessage.InformedOfConfiguration({
            configuration: buttonDefaults,
            presentation,
          }),
        ),
        Story.inMessage(
          FluidGalleryBlock.InMessage.InformedOfConfiguration({
            configuration: defaults,
            presentation,
            edited: [],
          }),
        ),
        Story.Command.expectNone(),
      )
      expect(configuredSidebar(retained)).toBe(configuredSidebar(afterLanding))
      expect(configuredSidebar(retained).threadSearch).toBe('Configured draft')
      expect(acceptConfiguration(defaults, afterLanding, retained)).toBe(defaults)

      const afterToggle = yield* Story.story(
        gallery,
        Story.given(retained),
        Story.messageIn([ConfiguredSidebarBinding, Sidebar], SidebarBlock.Message.Toggled()),
        Story.Command.expectNone(),
      )
      expect(acceptConfiguration(defaults, retained, afterToggle)).toMatchObject({
        state: 'closed',
      })
      expect(afterToggle.sidebar.open).toBe(true)
    }),
)

it.effect('keeps configured sidebar absent during landing presentation and interactions', () =>
  Effect.gen(function* () {
    const flags = yield* prepareGalleryFlags
    const initial = yield* Story.story(gallery, Story.init(flags), settleGallery())
    expect(Option.isNone(initial.configuredSidebar)).toBe(true)
    const after = yield* Story.story(
      gallery,
      Story.given(initial),
      Story.inMessage(
        FluidGalleryBlock.InMessage.InformedOfPresentation({
          presentation: { ...presentation, hover: 'standard', shape: 'sharp' },
        }),
      ),
      Story.inMessage(FluidGalleryBlock.InMessage.InformedOfPresentation({ presentation })),
      Story.models(
        Story.steps(
          Story.messageIn(
            Color,
            ColorPickerBlock.Message.SquareKey({ key: 'ArrowRight', shift: true }),
          ),
        ),
        (before: FluidGalleryModel, after) =>
          expect(colorValueOf(after.color)).not.toBe(colorValueOf(before.color)),
      ),
      Story.messageIn(LandingSidebar, SidebarBlock.Message.Toggled()),
      Story.model((model: FluidGalleryModel) => {
        expect(Option.isNone(model.configuredSidebar)).toBe(true)
        expect(model.sidebar.open).toBe(false)
        expect(model.sidebar.width).toBe('224px')
      }),
      Story.inMessage(
        FluidGalleryBlock.InMessage.InformedOfConfiguration({
          configuration: buttonDefaults,
          presentation,
        }),
      ),
      Story.inMessage(FluidGalleryBlock.InMessage.InformedOfViewport({ narrow: true })),
      Story.model((model: FluidGalleryModel) => {
        expect(model.isNarrow).toBe(true)
        expect(model.sidebar.width).toBe('224px')
      }),
      Story.Command.expectNone(),
    )
    expect(Option.isNone(after.configuredSidebar)).toBe(true)
    expect(acceptConfiguration(defaults, initial, after)).toBe(defaults)
  }),
)

const firstEdits: ReadonlyArray<ReadonlyArray<string> | undefined> = [undefined, [], ['width']]
for (const edited of firstEdits)
  it.effect(
    `admits the full latest sidebar configuration with edits ${JSON.stringify(edited)}`,
    () =>
      Effect.gen(function* () {
        const flags = yield* prepareGalleryFlags
        const latest = { ...presentation, hover: 'standard' } satisfies typeof presentation
        const configuration: Configuration = {
          ...defaults,
          state: 'closed',
          width: 312,
          side: 'right',
          variant: 'floating',
          collapsedBehavior: 'hover',
          appearance: edited === undefined ? {} : { hover: 'fluid' },
        }
        const initial = yield* Story.story(
          gallery,
          Story.init(flags),
          settleGallery(),
          Story.inMessage(
            FluidGalleryBlock.InMessage.InformedOfPresentation({ presentation: latest }),
          ),
          Story.inMessage(
            FluidGalleryBlock.InMessage.InformedOfConfiguration({
              configuration: buttonDefaults,
              presentation: latest,
            }),
          ),
          Story.inMessage(FluidGalleryBlock.InMessage.InformedOfViewport({ narrow: true })),
        )
        expect(Option.isNone(initial.configuredSidebar)).toBe(true)
        const admitted = yield* Story.story(
          gallery,
          Story.given(initial),
          Story.inMessage(
            FluidGalleryBlock.InMessage.InformedOfConfiguration({
              configuration,
              presentation: latest,
              ...(edited === undefined ? {} : { edited }),
              intent: 'initialize',
            }),
          ),
          settleNavigation(1),
          Story.Command.expectNone(),
        )
        const child = configuredSidebar(admitted)
        expect(isOpen(child)).toBe(false)
        expect(child.sidebar.width).toBe('312px')
        expect(child.sidebar.options).toMatchObject({
          side: 'right',
          variant: 'floating',
          peek: 'hover',
          collapsible: 'offcanvas',
          rail: true,
        })
        expect(child.sidebarMenus).toHaveLength(10)
        expect(child.sidebarTooltips.rows['preview-sidebar-inset-trigger']).toBeDefined()
        expect(child.threads.hover.mode).toBe(configuration.appearance.hover ?? latest.hover)
        expect(admitted.isNarrow).toBe(true)
        expect(acceptConfiguration(defaults, initial, admitted)).toBe(defaults)

        const partial = yield* Story.story(
          gallery,
          Story.given(admitted),
          Story.messageIn(
            ConfiguredSidebarBinding,
            ConfiguredSidebarBlock.Message.UpdatedThreadSearch({ value: 'Retained draft' }),
          ),
          Story.inMessage(
            FluidGalleryBlock.InMessage.InformedOfConfiguration({
              configuration: { ...configuration, state: 'opened', width: 280 },
              presentation: latest,
              edited: ['width'],
              intent: 'edit',
            }),
          ),
          Story.Command.expectNone(),
        )
        expect(isOpen(configuredSidebar(partial))).toBe(false)
        expect(configuredSidebar(partial).sidebar.width).toBe('280px')
        expect(configuredSidebar(partial).threadSearch).toBe('Retained draft')
        expect(configuredSidebar(partial).sidebarMenus).toBe(child.sidebarMenus)
        expect(configuredSidebar(partial).sidebarTooltips).toBe(child.sidebarTooltips)
        expect(acceptConfiguration(configuration, admitted, partial)).toBe(configuration)
        const refreshed = yield* Story.story(
          gallery,
          Story.given(partial),
          Story.inMessage(
            FluidGalleryBlock.InMessage.InformedOfPresentation({
              presentation: {
                ...latest,
                hover:
                  configuredSidebar(partial).threads.hover.mode === 'fluid' ? 'standard' : 'fluid',
              },
            }),
          ),
          Story.Command.expectNone(),
        )
        expect(configuredSidebar(refreshed).threads.hover.mode).not.toBe(
          configuredSidebar(partial).threads.hover.mode,
        )
        expect(configuredSidebar(refreshed).threadSearch).toBe('Retained draft')
        expect(configuredSidebar(refreshed).sidebarTooltips).toBe(child.sidebarTooltips)
        expect(isOpen(configuredSidebar(refreshed))).toBe(false)
      }),
  )
