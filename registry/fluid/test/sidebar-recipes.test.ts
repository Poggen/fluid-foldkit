// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { DropdownResourcesServerLayer } from '../src/dropdown-resources.js'
import { expect } from 'vitest'
import { Layer, Option, Schema, Effect } from 'effect'
import { Story } from 'foldkit'
import { it as test } from '@effect/vitest'
import { isDialogOpen, DialogResourcesServerLayer } from '../src/dialog.js'
import { SettingsDialogBlock as Dialog, SettingsDialogLayer } from '../src/dialog-sidebar.js'
import {
  SettingsPanelBlock as Panel,
  SettingsPanelLayer,
  test as panelTest,
} from '../src/sidebar-settings-panel.js'
import { InputFieldBlock } from '../src/input-group-field.js'
import { SwitchBlock } from '../src/switch.js'
import { SidebarAppBlock as App, SidebarAppLayer } from '../src/sidebar-app.js'
import { makeTooltipDomLayer } from '../src/tooltip-native-public.js'
import { HoverBlock, test as hoverTest } from '../src/hover.js'

const settleChoices = () =>
  Story.steps(
    ...['first', 'second', 'third'].flatMap((choice) => {
      const hover = hoverTest.ControlHover({
        id: `panel-${choice}-select-hover`,
        action: 'Remeasure',
        index: null,
        enabled: true,
      })
      return [
        Story.Command.expectHas(hover),
        Story.Command.resolve(hover, HoverBlock.Message.CompletedControl()),
      ]
    }),
    Story.Command.expectNone(),
  )

const resources = () =>
  Layer.mergeAll(
    DialogResourcesServerLayer,
    DropdownResourcesServerLayer,
    makeTooltipDomLayer(document, window),
  )
const dialog = () => ({
  block: Dialog,
  layer: SettingsDialogLayer.pipe(Layer.provide(resources())),
})
const panel = () => ({ block: Panel, layer: SettingsPanelLayer.pipe(Layer.provide(resources())) })
const app = () => ({ block: App, layer: SidebarAppLayer.pipe(Layer.provide(resources())) })

test.effect(
  'controlled dialog requests remain intents and the accepted state owns visibility',
  () =>
    Story.story(
      dialog(),
      Story.init({ id: 'settings', open: false, defaultSection: 'members' }),
      Story.inMessage(Dialog.InMessage.RequestedOpen()),
      Story.expectOutMessage(Dialog.OutMessage.OpenChanged({ open: true })),
      Story.model((m) => {
        expect(isDialogOpen(m.dialog)).toBe(false)
        expect(m.section).toBe('members')
      }),
      Story.inMessage(Dialog.InMessage.RequestedControlledOpen({ control: Option.some(true) })),
      Story.model((m) => {
        expect(isDialogOpen(m.dialog)).toBe(true)
        expect(m.sidebar.options.persist).toBe(false)
        expect(m.sidebar.options.shortcut).toBeNull()
        expect(m.sidebar.width).toBe('13rem')
        expect(m.sidebar.options.collapsible).toBe('none')
      }),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
    ),
)

test.effect('an unknown initial section retains source selection while rendering General', () =>
  Story.story(
    dialog(),
    Story.init({ id: 'settings', defaultSection: 'unknown' }),
    Story.model((m) => {
      expect(m.section).toBe('unknown')
      expect(m.nav.activeSlug).toEqual(Option.some('unknown'))
      expect(m.select.value).toBe('unknown')
      expect(m.panel.section).toBe('general')
    }),
    Story.Command.expectNone(),
  ),
)

test.effect('section remount resets edited settings, with defaults surviving replay', () =>
  Effect.gen(function* () {
    const notifications = yield* Story.story(
      panel(),
      Story.init({ id: 'panel', section: 'general' }),
      Story.messageIn(
        panelTest.Input,
        InputFieldBlock.Message.CapturedInput({ value: 'Edited name' }),
      ),
      Story.messageIn(panelTest.Digest, SwitchBlock.Message.CapturedToggle()),
      Story.model((m) => {
        expect(m.input.value).toBe('Edited name')
        expect(m.digest.checked).toBe(false)
      }),
      Story.inMessage(Panel.InMessage.RequestedReset({ section: 'notifications' })),
      settleChoices(),
      Story.model((m) => {
        expect(m.digest.checked).toBe(true)
        expect(m.mentions.checked).toBe(true)
        expect(m.updates.checked).toBe(false)
      }),
      Story.Command.expectNone(),
    )
    const codec = Schema.fromJsonString(Panel.Model)
    const replayed = yield* Schema.decodeEffect(codec)(
      yield* Schema.encodeEffect(codec)(notifications),
    )
    yield* Story.story(
      panel(),
      Story.given(replayed),
      Story.inMessage(Panel.InMessage.RequestedReset({ section: 'general' })),
      settleChoices(),
      Story.model((m) => {
        expect(m.input.value).toBe('Acme Inc')
        expect(m.first.value).toBe('en')
        expect(m.second.value).toBe('utc+1')
      }),
      Story.inMessage(Panel.InMessage.RequestedReset({ section: 'members' })),
      settleChoices(),
      Story.model((m) => {
        expect([m.first.value, m.second.value, m.third.value]).toEqual(['owner', 'admin', 'member'])
      }),
      Story.inMessage(Panel.InMessage.RequestedReset({ section: 'appearance' })),
      settleChoices(),
      Story.model((m) => {
        expect([m.first.value, m.second.value]).toEqual(['system', 'default'])
      }),
      Story.Command.expectNone(),
    )
  }),
)

test.effect('app recipe seeds the actual source rows and preserves controlled sidebar intent', () =>
  Story.story(
    app(),
    Story.init({ id: 'app', open: true }),
    Story.model((m) => {
      expect(m.active).toBe('Home')
      expect(m.desktop.id).not.toBe(m.mobile.id)
      expect(m.desktop.platform.hover.id).not.toBe(m.mobile.platform.hover.id)
      expect(m.desktop.navigation.hover.id).not.toBe(m.mobile.navigation.hover.id)
      expect(m.desktop.platform.activeSlug).toEqual(m.mobile.platform.activeSlug)
      expect(m.desktop.navigation.activeSlug).toEqual(m.mobile.navigation.activeSlug)
      expect(m.desktop.platform.items.map(({ label, badge }) => [label, badge])).toEqual([
        ['Home', null],
        ['Inbox', '12'],
        ['Calendar', null],
      ])
      expect(m.desktop.navigation.items.map(({ label, badge }) => [label, badge])).toEqual([
        ['Notifications', '3'],
        ['Members', null],
        ['Settings', null],
      ])
    }),
    Story.inMessage(App.InMessage.RequestedOpen({ open: false })),
    Story.expectOutMessage(App.OutMessage.OpenChanged({ open: false, mobile: false })),
    Story.model((m) => {
      expect(m.sidebar.open).toBe(true)
    }),
    Story.inMessage(App.InMessage.RequestedControlledOpen({ open: false })),
    Story.model((m) => {
      expect(m.sidebar.open).toBe(false)
    }),
    Story.inMessage(App.InMessage.RequestedWidth({ width: '20rem' })),
    Story.model((m) => {
      expect(m.sidebar.width).toBe('20rem')
    }),
    Story.Command.expectNone(),
  ),
)

test.effect(
  'App forwards rail tooltip control and releases it without changing panel selection',
  () =>
    Story.story(
      app(),
      Story.init({ id: 'rail-app', active: 'Inbox', railTooltipOpen: false }),
      Story.inMessage(App.InMessage.RequestedRailTooltipOpen({ open: true })),
      Story.model((model) => {
        expect(model.sidebar.railTooltipOpen).toEqual(Option.some(true))
        expect(model.active).toBe('Inbox')
      }),
      Story.inMessage(App.InMessage.RequestedRailTooltipOpen({ open: null })),
      Story.model((model) => {
        expect(model.sidebar.railTooltipOpen).toEqual(Option.none())
        expect(model.active).toBe('Inbox')
      }),
      Story.expectNoOutMessage(),
      Story.Command.expectNone(),
    ),
)
