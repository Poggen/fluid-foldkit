/* @license Adapted from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { Effect, Layer, Queue, Schema, Stream } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { Button } from '@foldkit-visuals/fluid/button'
import { InputBlock, layer as InputLayer } from '@foldkit-visuals/fluid/input'
import {
  SelectBlock,
  layer as SelectLayer,
  hoverModeOf as selectHoverModeOf,
} from '@foldkit-visuals/fluid/select'
import {
  TabsBlock,
  TabsItem,
  layer as TabsLayer,
  hoverModeOf as tabsHoverModeOf,
} from '@foldkit-visuals/fluid/tabs'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import { sizeMap, typeStyles } from '@foldkit-visuals/fluid/tokens'
import { childAttributes } from 'foldkit/html'
import { ComponentPresentation } from '../settings'
import { typographyRouter } from '../route'
import { target } from '../motion'
import { copy, example, page, section, type PageInputs } from './view'
const Size = Schema.Literals(['default', 'compact'])
const key = Symbol('SizesSystemPage')
const SizesSystemPageBlock = Block.make('SizesSystemPage', {
  key,
  InitArgs: Schema.Tuple([ComponentPresentation]),
  Model: Schema.Struct({
    inputs: Schema.Record(Schema.String, InputBlock.Model),
    selects: Schema.Record(Schema.String, SelectBlock.Model),
    tabs: Schema.Record(Schema.String, TabsBlock.Model),
    localSize: Size,
    inspected: Schema.NullOr(
      Schema.Struct({
        label: Schema.String,
        height: Schema.Finite,
        padding: Schema.String,
        fontSize: Schema.String,
      }),
    ),
  }),
  Message: defineMessageUnion({
    ToggledSize: {},
    ObservedToken: {
      label: Schema.String,
      height: Schema.Finite,
      padding: Schema.String,
      fontSize: Schema.String,
    },
  }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  effects: Block.makeEffectsContract<
    never,
    | Block.FactsOf<typeof SelectBlock>['programRequirements']
    | Block.FactsOf<typeof InputBlock>['programRequirements']
  >(),
  view: { kind: 'Element', Inputs: Block.makeInputContract<PageInputs>() },
})
export { SizesSystemPageBlock as SizesPageBlock }
const RawInputs = SizesSystemPageBlock.makeRecordBinding(InputBlock, { field: 'inputs' })
const Inputs = RawInputs.withOutMessagePolicy({
  fold: (key) =>
    SizesSystemPageBlock.makeOutMessageFold(InputBlock, {
      FilesChanged: SizesSystemPageBlock.makeNoopStep,
      Changed: ({ value }) =>
        RawInputs.requestConfigure(key, { value, disabled: false, readOnly: false }),
    }),
})
const RawSelects = SizesSystemPageBlock.makeRecordBinding(SelectBlock, { field: 'selects' })
const items = [
  { value: 'updated', label: 'Last updated' },
  { value: 'name', label: 'Name' },
  { value: 'created', label: 'Created' },
]
const Selects = RawSelects.withOutMessagePolicy({
  fold: (key) =>
    SizesSystemPageBlock.makeOutMessageFold(SelectBlock, {
      OpenChanged: SizesSystemPageBlock.makeNoopStep,
      Selected: ({ value }) => RawSelects.requestConfigure(key, { items, value, disabled: false }),
    }),
})
const RawTabs = SizesSystemPageBlock.makeRecordBinding(TabsBlock, { field: 'tabs' })
const Tabs = RawTabs.withOutMessagePolicy({
  fold: (key) =>
    SizesSystemPageBlock.makeOutMessageFold(TabsBlock, {
      Selected: ({ index }) => RawTabs.requestSelected(key, { selectedIndex: index }),
    }),
})
const Observe = SizesSystemPageBlock.makeMountStream('ObserveSizeSpecimen', {
  messages: [SizesSystemPageBlock.Message.ObservedToken],
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Paused'
            ? Stream.never
            : Stream.callback<typeof SizesSystemPageBlock.Message.ObservedToken.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    let current: HTMLElement | null = null
                    const read = () => {
                      if (current === null || !current.isConnected) return
                      const styles = getComputedStyle(current)
                      Queue.offerUnsafe(
                        queue,
                        SizesSystemPageBlock.Message.ObservedToken({
                          label: current.dataset.sizeSpecimen ?? 'Control',
                          height: Math.round(current.getBoundingClientRect().height * 10) / 10,
                          padding: `${styles.paddingBlock} / ${styles.paddingInline}`,
                          fontSize: styles.fontSize,
                        }),
                      )
                    }
                    const observer = new ResizeObserver(read)
                    const inspect = (event: Event) => {
                      const next =
                        event.target instanceof Element
                          ? event.target.closest<HTMLElement>('[data-size-specimen]')
                          : null
                      if (next === null || !element.contains(next) || next === current) return
                      observer.disconnect()
                      current = next
                      observer.observe(next)
                      read()
                    }
                    element.addEventListener('pointerover', inspect)
                    element.addEventListener('focusin', inspect)
                    return () => {
                      observer.disconnect()
                      element.removeEventListener('pointerover', inspect)
                      element.removeEventListener('focusin', inspect)
                    }
                  }),
                  (release) => Effect.sync(release),
                ).pipe(Effect.flatMap(() => Effect.never)),
              ),
        ),
      )
  },
})
const SizesSystemPageComposition = SizesSystemPageBlock.makeComposition({
  bindings: [Inputs, Selects, Tabs],
  mounts: [Observe],
})
const names = ['default', 'compact', 'region']
const implementation = {
  EffectsLayer: Observe.layer,
  init: SizesSystemPageComposition.makeInit((settings) => ({
    model: { inputs: {}, selects: {}, tabs: {}, localSize: 'compact', inspected: null },
    steps: names.flatMap((key) => [
      SizesSystemPageBlock.makeStep((model) =>
        initAndInsert(Inputs, model, {
          key,
          args: [{ id: `system-size-input-${key}`, value: '' }],
        }),
      ),
      SizesSystemPageBlock.makeStep((model) =>
        initAndInsert(Selects, model, {
          key,
          args: [
            {
              id: `system-size-select-${key}`,
              items,
              defaultValue: 'updated',
              hoverMode: settings.hover,
            },
          ],
        }),
      ),
      SizesSystemPageBlock.makeStep((model) =>
        initAndInsert(Tabs, model, {
          key,
          args: [{ id: `system-size-tabs-${key}`, selectedIndex: 0, hoverMode: settings.hover }],
        }),
      ),
    ]),
  })),
  update: SizesSystemPageComposition.makeUpdate({
    ToggledSize: SizesSystemPageBlock.makeFieldsStep(() => ({
      localSize: (size) => (size === 'default' ? 'compact' : 'default'),
    })),
    ObservedToken: SizesSystemPageBlock.makeFieldsStep.fromMessage(
      ({ label, height, padding, fontSize }) => ({
        inspected: () => ({ label, height, padding, fontSize }),
      }),
    ),
  }),
  inMessageUpdate: SizesSystemPageComposition.makeInMessageUpdate({
    InformedOfPresentation: SizesSystemPageBlock.makeStep((model, { presentation }) =>
      Update.combineSteps([
        ...Object.entries(model.tabs).flatMap(([key, child]) =>
          tabsHoverModeOf(child) === presentation.hover
            ? []
            : [Tabs.requestHoverMode(key, { mode: presentation.hover })],
        ),
        ...Object.entries(model.selects).flatMap(([key, child]) =>
          selectHoverModeOf(child) === presentation.hover
            ? []
            : [Selects.requestHoverMode(key, { mode: presentation.hover })],
        ),
      ]),
    ),
  }),
  view: SizesSystemPageComposition.makeView.withInputs((model, { settings }, h) => {
    const toolbar = (key: string, size: typeof Size.Type) => {
      const input = model.inputs[key],
        select = model.selects[key],
        tabs = model.tabs[key]
      if (input === undefined || select === undefined || tabs === undefined) return h.empty
      const context = createPresentationContext({
        shape: settings.shape,
        size,
        hoverMode: settings.hover,
        reducedMotion: 'user',
        hasSizeProvider: true,
      })
      return h.div(
        [
          h.Class(
            '[.system-docs_&]:flex [.system-docs_&]:items-center [.system-docs_&]:flex-wrap [.system-docs_&]:gap-3 [.system-docs_&]:py-4 [.system-docs_&_>_strong]:[flex:1_0_100%] ',
          ),
        ],
        [
          h.strong([], [`${size} · ${sizeMap[size].controlHeight}px`]),
          h.block(
            Inputs.embedView({
              key,
              slotId: input.id,
              model: input,
              viewInputs: {
                context,
                placeholder: 'Search projects',
                attributes: childAttributes([h.AriaLabel(`${size} project search`)]),
              },
            }),
          ),
          h.block(
            Tabs.embedView({
              key,
              slotId: tabs.id,
              model: tabs,
              viewInputs: {
                context,
                animate: target.node,
                items: [{ value: 'Table' }, { value: 'Board' }],
                content: (t) =>
                  ['Table', 'Board'].map((label, index) => TabsItem({ index, label }, t, h)),
              },
            }),
          ),
          h.block(
            Selects.embedView({
              key,
              slotId: select.id,
              model: select,
              viewInputs: { context, animate: target.node, placeholder: 'Sort projects' },
            }),
          ),
          Button(
            {
              context,
              children: ['New'],
              attributes: [h.DataAttribute('size-specimen', `${size} button`)],
            },
            h,
          ),
        ],
      )
    }
    const context = createPresentationContext({
      shape: settings.shape,
      size: settings.size,
      hoverMode: settings.hover,
      reducedMotion: 'user',
    })
    return page(h, 'sizes', settings, [
      section(h, 'The principle', [
        ...copy(h, 'sizes', 'The principle'),
        example(
          h,
          'Two control sizes',
          [
            h.div(
              [h.OnMount(Observe())],
              [toolbar('default', 'default'), toolbar('compact', 'compact')],
            ),
          ],
          settings,
        ),
      ]),
      section(h, 'Typography scale', [
        h.p(
          [],
          [
            'Type follows the ladder. Compact drops each role one notch, size and leading together, so a dense screen keeps the same hierarchy at a smaller size.',
          ],
        ),
        h.a([h.Href(typographyRouter())], ['Explore Typography']),
      ]),
      section(h, 'Compact regions', [
        h.p(
          [],
          [
            'Density is a region decision, not a per-control one. The native SizeProvider passes one presentation context to the region and its menus, including portalled content.',
          ],
        ),
        Button(
          {
            context,
            variant: 'secondary',
            children: [`Switch region to ${model.localSize === 'compact' ? 'default' : 'compact'}`],
            attributes: [h.OnClick(SizesSystemPageBlock.Message.ToggledSize())],
          },
          h,
        ),
        toolbar('region', model.localSize),
      ]),
      section(h, 'Token reference', [
        h.p(
          [],
          [
            'Hover or focus either New button. The readout measures the actual rendered control and updates when its dimensions change.',
          ],
        ),
        h.output(
          [
            h.Class('font-mono text-[11px] leading-4 normal-case tracking-normal'),
            h.AriaLive('polite'),
          ],
          [
            model.inspected === null
              ? 'Focus or hover a specimen.'
              : `${model.inspected.label}: ${model.inspected.height}px high; font ${model.inspected.fontSize}; padding ${model.inspected.padding}.`,
          ],
        ),
        h.table(
          [
            h.Class(
              'w-full border-collapse text-site-body tabular-nums [&_th:first-child]:pl-0 [&_td:first-child]:pl-0',
            ),
          ],
          [
            h.thead(
              [],
              [
                h.tr(
                  [],
                  ['Token', 'Default', 'Compact'].map((text) =>
                    h.th([h.Class('px-3 py-2 text-left text-foreground')], [text]),
                  ),
                ),
              ],
            ),
            h.tbody(
              [],
              [
                [
                  'Control height',
                  String(sizeMap.default.controlHeight),
                  String(sizeMap.compact.controlHeight),
                ],
                ['Icon', String(sizeMap.default.icon), String(sizeMap.compact.icon)],
                ...Object.entries(typeStyles).map(([role, value]) => [
                  role,
                  `${value.default.size}/${value.default.leading}`,
                  `${value.compact.size}/${value.compact.leading}`,
                ]),
              ].map((row) =>
                h.tr(
                  [],
                  row.map((text) => h.td([h.Class('px-3 py-2 text-muted-foreground')], [text])),
                ),
              ),
            ),
          ],
        ),
      ]),
      section(h, 'SizeProvider props', [
        h.p(
          [],
          [
            'SizeProvider accepts size or defaultSize and a children callback. The callback receives the resolved native PresentationContext.',
          ],
        ),
      ]),
      section(h, 'Component size prop', [
        h.p(
          [],
          [
            'An explicit component size overrides the surrounding presentation context. Use region defaults for coherent toolbars; use an override only when one control deliberately differs.',
          ],
        ),
      ]),
    ])
  }),
}
export const layer = SizesSystemPageBlock.makeLayer<typeof implementation>(implementation).pipe(
  Layer.provide(Layer.mergeAll(InputLayer, SelectLayer, TabsLayer)),
)
