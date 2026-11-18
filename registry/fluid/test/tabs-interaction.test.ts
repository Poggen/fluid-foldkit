// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect, Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime, Story } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect, vi } from 'vitest'
import { TabsBlock, TabsItem, layer as PrimaryLayer } from '../src/tabs.js'
import { defaultIcons } from '../src/icons.js'
import { createPresentationContext } from '../src/presentation.js'
const SecondaryModelJson = Schema.fromJsonString(Schema.toCodecJson(TabsBlock.Model))
const TabsInteractionKey = Symbol('TabsInteraction')
const Message = defineMessageUnion({
  SelectedDisabled: {},
  SelectedFirst: {},
  ToggleAcceptance: {},
  ToggleVisible: {},
  ToggleReduced: {},
})
const effects = Block.makeEffectsContract()
const Root = Block.make('TabsInteraction', {
  key: TabsInteractionKey,
  Model: Schema.Struct({
    primary: TabsBlock.Model,
    secondary: TabsBlock.Model,
    accepts: Schema.Boolean,
    visible: Schema.Boolean,
    reduced: Schema.Boolean,
  }),
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects,
})
const BarePrimary = Root.makeRequiredFieldBinding(TabsBlock, {
  field: 'primary',
  init: { contextToArgs: () => [{ id: 'icon-primary', selectedIndex: 0 }] },
})
const Primary = BarePrimary.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(TabsBlock, {
    Selected: ({ index }) =>
      Root.makeStep((model) =>
        model.accepts ? BarePrimary.requestSelected({ selectedIndex: index }) : Root.makeNoopStep(),
      ),
  }),
})
const BareSecondary = Root.makeRequiredFieldBinding(TabsBlock, {
  field: 'secondary',
  init: { contextToArgs: () => [{ id: 'icon-secondary', selectedIndex: 0, activeLabel: true }] },
})
const Secondary = BareSecondary.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(TabsBlock, {
    Selected: ({ index }) =>
      Root.makeStep((model) =>
        model.accepts
          ? BareSecondary.requestSelected({ selectedIndex: index })
          : Root.makeNoopStep(),
      ),
  }),
})
const composition = Root.makeComposition({ bindings: [Primary, Secondary] })
const layer = Root.makeLayer({
  init: composition.makeInit(() => ({ model: { accepts: true, visible: true, reduced: false } })),
  update: composition.makeUpdate({
    ToggleAcceptance: Root.makeFieldsStep(() => ({ accepts: (value) => !value })),
    ToggleVisible: Root.makeFieldsStep(() => ({ visible: (value) => !value })),
    ToggleReduced: Root.makeFieldsStep(() => ({ reduced: (value) => !value })),
    SelectedDisabled: Root.makeStep(() => Secondary.requestSelected({ selectedIndex: 2 })),
    SelectedFirst: Root.makeStep(() => Secondary.requestSelected({ selectedIndex: 0 })),
  }),
  view: composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.section(
          [h.Id('primary-host')],
          [
            h.block(
              Primary.embedView({
                slotId: 'primary',
                model: model.primary,
                viewInputs: {
                  items: [
                    { value: 'First' },
                    { value: 'Second' },
                    { value: 'Disabled', disabled: true },
                  ],
                  context: createPresentationContext({
                    reducedMotion: model.reduced ? 'always' : 'never',
                  }),
                  animate: (node) => node,
                  content: (context) =>
                    ['First', 'Second', 'Disabled'].map((label, index) =>
                      TabsItem({ index, label, icon: defaultIcons.home }, context, h),
                    ),
                },
              }),
            ),
          ],
        ),
        h.section(
          [h.Id('secondary-host')],
          [
            model.visible
              ? h.block(
                  Secondary.embedView({
                    slotId: 'secondary',
                    model: model.secondary,
                    viewInputs: {
                      items: [
                        { value: 'First' },
                        { value: 'Second' },
                        { value: 'Disabled', disabled: true },
                      ],
                      context: createPresentationContext({
                        reducedMotion: model.reduced ? 'always' : 'never',
                      }),
                      animate: (node) => node,
                      content: (context) =>
                        ['First', 'Second', 'Disabled'].map((label, index) =>
                          TabsItem({ index, label, icon: defaultIcons.home }, context, h),
                        ),
                    },
                  }),
                )
              : null,
          ],
        ),
        h.button(
          [h.Id('select-disabled'), h.OnClick(Message.SelectedDisabled())],
          ['Select disabled'],
        ),
        h.button([h.Id('select-first'), h.OnClick(Message.SelectedFirst())], ['Select first']),
        h.button(
          [h.Id('toggle-acceptance'), h.OnClick(Message.ToggleAcceptance())],
          ['Toggle acceptance'],
        ),
        h.button([h.Id('toggle-visible'), h.OnClick(Message.ToggleVisible())], ['Toggle visible']),
        h.button([h.Id('toggle-reduced'), h.OnClick(Message.ToggleReduced())], ['Toggle reduced']),
        h.output([h.Id('acceptance')], [String(model.accepts)]),
        h.output(
          [h.Id('observed')],
          [`${model.primary.items.length},${model.secondary.items.length}`],
        ),
        h.output(
          [h.Id('secondary-model')],
          [Schema.encodeSync(SecondaryModelJson)(model.secondary)],
        ),
        h.output([h.Id('roving')], [String(Option.getOrNull(model.secondary.rovingIndex))]),
        h.output(
          [h.Id('selected')],
          [`${model.primary.selectedIndex},${model.secondary.selectedIndex}`],
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(PrimaryLayer))
const secondaryTabs = () =>
  document.querySelectorAll<HTMLButtonElement>('#secondary-host [role=tab]')
const _primaryTabs = () => document.querySelectorAll<HTMLButtonElement>('#primary-host [role=tab]')
const waitFor = (
  assertion: () => void,
  options?: {
    readonly timeout?: number
    readonly interval?: number
  },
) => Effect.promise(vi.waitFor.bind(vi, assertion, options))
const withoutEmulatedWaapi = Effect.acquireRelease(
  Effect.sync(() => {
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
    if (descriptor === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
      throw new Error('Tabs resource test requires scoped WAAPI capability removal')
    }
    return descriptor
  }),
  (descriptor) =>
    Effect.sync(() => Object.defineProperty(Element.prototype, 'animate', descriptor)),
)
it.live(
  'routes actual SVG icon presses through each mounted child and the parent selection policy',
  () =>
    Effect.gen(function* selectFromIcon() {
      yield* withoutEmulatedWaapi
      expect(Object.hasOwn(Element.prototype, 'animate')).toBe(false)
      const container = document.createElement('div')
      container.id = 'tabs-icon-regression'
      document.body.append(container)
      const handle = Runtime.embed(Program.makeElement({ block: Root, layer, container }))
      try {
        yield* waitFor(() => {
          expect(document.querySelector('#observed')?.textContent).toBe('3,3')
        })
        for (const id of ['primary-host', 'secondary-host']) {
          const [, button] = document.querySelectorAll(`#${id} [role=tab]`)
          const iconPath = button?.querySelector('svg path')
          if (iconPath === null || iconPath === undefined) {
            throw new Error('Missing real SVG icon target')
          }
          expect(iconPath).toBeInstanceOf(SVGElement)
          iconPath.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
          iconPath.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }))
        }
        yield* waitFor(
          () => {
            expect(document.querySelector('#selected')?.textContent).toBe('1,1')
          },
          {
            timeout: 500,
          },
        )
        yield* waitFor(() => {
          expect(
            document.querySelector('#roving')?.textContent,
            document.querySelector('#secondary-model')?.textContent ?? 'Missing real Model',
          ).toBe('1')
        })
        const exitingModel = yield* Schema.decodeUnknownEffect(SecondaryModelJson)(
          document.querySelector('#secondary-model')?.textContent,
        )
        const oldExit = exitingModel.labels.find((label) => label.index === 0)
        if (oldExit === undefined || oldExit.phase !== 'Exiting') {
          throw new Error('Missing actual outgoing label')
        }
        const selectDisabled = document.querySelector('#select-disabled')
        const selectFirst = document.querySelector('#select-first')
        if (selectDisabled === null || selectFirst === null) {
          throw new Error('Missing public selection controls')
        }
        expect(document.querySelector('#secondary-host')?.contains(document.activeElement)).toBe(
          false,
        )
        selectDisabled.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        yield* waitFor(() => {
          expect(document.querySelector('#selected')?.textContent).toBe('1,2')
        })
        expect(secondaryTabs()[1]?.tabIndex).toBe(0)
        expect(secondaryTabs()[2]?.tabIndex).toBe(-1)
        document
          .querySelector('#select-first')
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        yield* waitFor(() => {
          expect(secondaryTabs()[0]?.tabIndex).toBe(0)
        })
        yield* waitFor(() => {
          expect(document.querySelector('#roving')?.textContent).toBe('0')
        })
        const restored = yield* Schema.decodeUnknownEffect(SecondaryModelJson)(
          document.querySelector('#secondary-model')?.textContent,
        )
        yield* Story.story(
          { block: TabsBlock, layer: PrimaryLayer },
          Story.given(restored),
          Story.message(
            TabsBlock.Message.CompletedLabelExit({ index: 0, generation: oldExit.generation }),
          ),
          Story.model((model) => {
            expect(model.labels.find((label) => label.index === 0)?.phase).toBe('Present')
          }),
          Story.Command.expectNone(),
        )
      } finally {
        yield* Effect.promise(handle.dispose.bind(handle))
        expect(Object.hasOwn(Element.prototype, 'animate')).toBe(false)
        container.remove()
      }
    }),
)
it.live(
  'selected pills follow accepted targets, reverse independently and reacquire exact physical leases',
  () =>
    Effect.gen(function* selectedPillLifecycle() {
      yield* withoutEmulatedWaapi
      expect(Object.hasOwn(Element.prototype, 'animate')).toBe(false)
      // oxlint-disable-next-line landmines-testing/no-test-doubles -- Finite tab metrics control reversal and physical lease races; real geometry keeper: host-geometry-contracts.e2e.ts.
      const width = vi
        .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
        .mockImplementation(function width(this: HTMLElement) {
          return Object.hasOwn(this.dataset, 'fluidHoverIndex') ? 100 : 300
        })
      // oxlint-disable-next-line landmines-testing/no-test-doubles -- Finite tab metrics control reversal and physical lease races; real geometry keeper: host-geometry-contracts.e2e.ts.
      const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(36)
      // oxlint-disable-next-line landmines-testing/no-test-doubles -- Finite tab metrics control reversal and physical lease races; real geometry keeper: host-geometry-contracts.e2e.ts.
      const left = vi
        .spyOn(HTMLElement.prototype, 'offsetLeft', 'get')
        .mockImplementation(function left(this: HTMLElement) {
          return Number(this.dataset.fluidHoverIndex ?? 0) * 100
        })
      const host = document.createElement('div')
      const mount = document.createElement('div')
      mount.id = 'tabs-pill-regression'
      host.append(mount)
      document.body.append(host)
      const handle = Runtime.embed(Program.makeElement({ block: Root, layer, container: mount }))
      const pill = (variant: string) =>
        host.querySelector<HTMLElement>(`#${variant}-host [data-tabs-selected-pill]`)
      const click = (selector: string) => {
        const element = host.querySelector(selector)
        if (element === null) {
          throw new Error(`Missing ${selector}`)
        }
        element.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0 }))
      }
      const readSecondary = () =>
        Schema.decodeUnknownSync(SecondaryModelJson)(
          host.querySelector('#secondary-model')?.textContent,
        )
      try {
        yield* waitFor(() => {
          expect(pill('secondary')?.style.left).toBe('0px')
          expect(pill('primary')?.style.left).toBe('0px')
          expect(Option.isSome(readSecondary().selectedPillLease)).toBe(true)
        })
        const original = pill('secondary')
        if (original === null) {
          throw new Error('Missing selected pill')
        }
        const initialLease = readSecondary().selectedPillLease
        click('#toggle-acceptance')
        yield* waitFor(() => {
          expect(host.querySelector('#acceptance')?.textContent).toBe('false')
        })
        click('#secondary-host [data-fluid-hover-index="1"]')
        yield* Effect.sleep('30 millis')
        expect(readSecondary().selectedIndex).toBe(0)
        expect(original.style.left).toBe('0px')
        click('#toggle-acceptance')
        yield* waitFor(() => {
          expect(host.querySelector('#acceptance')?.textContent).toBe('true')
        })
        click('#secondary-host [data-fluid-hover-index="1"]')
        yield* waitFor(
          () => {
            expect(Number(original.style.left.replace('px', ''))).toBeGreaterThan(0)
            expect(Number(original.style.left.replace('px', ''))).toBeLessThan(100)
          },
          { interval: 5 },
        )
        click('#secondary-host [data-fluid-hover-index="0"]')
        yield* waitFor(() => {
          expect(original.style.left).toBe('0px')
        })
        expect(pill('secondary')).toBe(original)
        expect(pill('primary')?.style.left).toBe('0px')
        click('#secondary-host [data-fluid-hover-index="1"]')
        yield* waitFor(() => {
          expect(readSecondary().selectedIndex).toBe(1)
        })
        click('#toggle-visible')
        yield* waitFor(() => {
          expect(original.isConnected).toBe(false)
        })
        let writes = 0
        const retired = new MutationObserver((records) => {
          writes += records.length
        })
        retired.observe(original, { attributes: true })
        yield* Effect.sleep('30 millis')
        retired.disconnect()
        expect(writes).toBe(0)
        click('#toggle-visible')
        yield* waitFor(() => {
          expect(pill('secondary')?.style.left).toBe('100px')
          expect(readSecondary().selectedPillLease).not.toEqual(initialLease)
        })
        expect(pill('secondary')).not.toBe(original)
        const replacement = pill('secondary')
        if (replacement === null) {
          throw new Error('Missing replacement pill')
        }
        click('#toggle-reduced')
        yield* waitFor(() => {
          expect(replacement.dataset.tabsPillReducedMotion).toBe('always')
        })
        click('#secondary-host [data-fluid-hover-index="0"]')
        yield* waitFor(
          () => {
            expect(Number(replacement.style.left.replace('px', ''))).toBeGreaterThan(0)
            expect(Number(replacement.style.left.replace('px', ''))).toBeLessThan(100)
          },
          { interval: 5 },
        )
        yield* waitFor(() => {
          expect(replacement.style.left).toBe('0px')
        })
        click('#secondary-host [data-fluid-hover-index="1"]')
        yield* waitFor(() => {
          expect(replacement.style.left).toBe('100px')
        })
        click('#toggle-visible')
        yield* waitFor(() => {
          expect(replacement.isConnected).toBe(false)
        })
        click('#toggle-visible')
        yield* waitFor(() => {
          expect(pill('secondary')?.style.left).toBe('100px')
        })
        const reduced = pill('secondary')
        if (reduced === null) {
          throw new Error('Missing reduced-motion reacquisition')
        }
        expect(reduced).not.toBe(replacement)
        const positions: Array<number> = []
        const changes = new MutationObserver(() => {
          positions.push(Number(reduced.style.left.replace('px', '')))
        })
        changes.observe(reduced, { attributes: true, attributeFilter: ['style'] })
        click('#secondary-host [data-fluid-hover-index="0"]')
        yield* waitFor(() => {
          expect(reduced.style.left).toBe('0px')
        })
        changes.disconnect()
        expect(positions.length).toBeGreaterThan(0)
        expect(positions.every((position) => position === 0 || position === 100)).toBe(true)
      } finally {
        yield* Effect.promise(handle.dispose.bind(handle))
        expect(Object.hasOwn(Element.prototype, 'animate')).toBe(false)
        host.remove()
        width.mockRestore()
        height.mockRestore()
        left.mockRestore()
      }
    }),
)
