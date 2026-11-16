import { Button, Input } from '@foldkit/ui'
import { Boolean, Number } from 'effect'
import { exampleHoverConfig, examplePresentation } from './example-presentation.js'
import { Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { TabsBlock, TabsItem, TabsPanel, layer as TabsLayer } from '@foldkit-visuals/fluid/tabs'
import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import './tabs-forms.css'

const withPanels = new URLSearchParams(window.location.search).get('panels') !== 'none'

const sourcePreset = new URLSearchParams(window.location.search).get('preset') === 'source'

const disabledActivity = new URLSearchParams(window.location.search).get('disabled') === 'activity'

const labels = sourcePreset
  ? ['Teamspaces', 'Recents', 'Favorites', 'Shared']
  : ['Overview', 'Activity', 'Settings']

const icons = sourcePreset
  ? [defaultIcons['square-library'], defaultIcons.clock, defaultIcons.star, defaultIcons.users]
  : [defaultIcons.home, defaultIcons.clock, defaultIcons.settings]

const visibleItems = (first: boolean) =>
  labels
    .map((value, index) => ({
      value,
      iconIndex: index,
      disabled: disabledActivity && !sourcePreset && value === labels[1],
    }))
    .filter((_item, index) => first || index !== 0)

const effects = Block.makeEffectsContract()

const Model = Schema.Struct({
  tabs: TabsBlock.Model,
  isCompact: Schema.Boolean,
  isPill: Schema.Boolean,
  shape: Schema.Literals(['rounded', 'pill', 'sharp']),
  hasIcons: Schema.Boolean,
  isMounted: Schema.Boolean,
  selections: Schema.Natural,
  isSelectionRejected: Schema.Boolean,
  isFirstItemVisible: Schema.Boolean,
  shouldPreserveInput: Schema.Boolean,
})

const Message = defineMessageUnion({
  ClickedSelect: {},
  ClickedReject: {},
  ClickedSize: {},
  ClickedShape: {},
  ClickedIcons: {},
  ClickedActiveLabel: {},
  ClickedMount: {},
  ClickedDirection: {},
  ClickedFirst: {},
  ClickedFocusPolicy: {},
  PressedNavigationKey: { direction: Schema.Literals(['Left', 'Right']) },
})

export const TabsExampleKey = Symbol('FluidTabsExampleBlock')

const FluidTabsExampleBlock = Block.make('FluidTabsExample', {
  key: TabsExampleKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
  view: { kind: 'Document' },
  effects,
})

const BareTabs = FluidTabsExampleBlock.makeRequiredFieldBinding(TabsBlock, {
  field: 'tabs',
  init: {
    contextToArgs: () => [
      withPanels
        ? { ...exampleHoverConfig, id: 'tabs', idPrefix: 'example', selectedIndex: 0 }
        : { ...exampleHoverConfig, id: 'tabs', selectedIndex: 0 },
    ],
  },
})

const Tabs = BareTabs.withOutMessagePolicy({
  fold: FluidTabsExampleBlock.makeOutMessageFold(TabsBlock, {
    Selected: ({ index }) =>
      FluidTabsExampleBlock.makeStep((model) =>
        Update.combineSteps([
          ...(model.isSelectionRejected
            ? []
            : [BareTabs.requestSelected({ selectedIndex: index })]),
          FluidTabsExampleBlock.makeFieldsStep(() => ({
            selections: Number.increment,
          })),
        ]),
      ),
  }),
})

const FluidTabsExampleComposition = FluidTabsExampleBlock.makeComposition({
  bindings: [Tabs],
})

const init = FluidTabsExampleComposition.makeInit(() => ({
  model: {
    isCompact: false,
    isPill: examplePresentation.shape === 'pill',
    shape: examplePresentation.shape ?? 'rounded',
    hasIcons: false,
    isMounted: true,
    selections: 0,
    isSelectionRejected: false,
    isFirstItemVisible: true,
    shouldPreserveInput: false,
  },
}))

const update = FluidTabsExampleComposition.makeUpdate({
  ClickedReject: FluidTabsExampleBlock.makeFieldsStep(() => ({ isSelectionRejected: Boolean.not })),
  ClickedFocusPolicy: FluidTabsExampleBlock.makeFieldsStep(() => ({
    shouldPreserveInput: Boolean.not,
  })),
  PressedNavigationKey: FluidTabsExampleBlock.makeStep(
    (model, { direction }: typeof Message.PressedNavigationKey.Type) =>
      Tabs.requestNavigate({
        direction,
        focus: false,
        items: visibleItems(model.isFirstItemVisible).map(({ value, disabled }) => ({
          value,
          disabled,
        })),
      }),
  ),
  ClickedFirst: FluidTabsExampleBlock.makeStep((model) => {
    const selectedLabel = visibleItems(model.isFirstItemVisible)[model.tabs.selectedIndex]?.value
    const nextItems = visibleItems(!model.isFirstItemVisible)
    const retainedIndex = nextItems.findIndex((item) => item.value === selectedLabel)

    const selectedIndex =
      retainedIndex === -1
        ? Math.max(
            0,
            nextItems.findIndex((item) => !item.disabled),
          )
        : retainedIndex

    return Update.combineSteps([
      FluidTabsExampleBlock.makeFieldsStep(() => ({ isFirstItemVisible: Boolean.not })),
      Tabs.requestSelected({ selectedIndex }),
    ])
  }),
  ClickedSelect: FluidTabsExampleBlock.makeStep((model) =>
    Tabs.requestSelected({
      selectedIndex:
        model.tabs.selectedIndex === 0 ? visibleItems(model.isFirstItemVisible).length - 1 : 0,
    }),
  ),
  ClickedSize: FluidTabsExampleBlock.makeFieldsStep(() => ({ isCompact: Boolean.not })),
  ClickedShape: FluidTabsExampleBlock.makeFieldsStep(() => ({
    isPill: Boolean.not,
    shape: (shape) => (shape === 'pill' ? 'rounded' : 'pill'),
  })),
  ClickedIcons: FluidTabsExampleBlock.makeFieldsStep(() => ({ hasIcons: Boolean.not })),
  ClickedActiveLabel: FluidTabsExampleBlock.makeStep((model) =>
    Tabs.requestActiveLabel({ activeLabel: !model.tabs.activeLabel }),
  ),
  ClickedDirection: FluidTabsExampleBlock.makeStep((model) =>
    Tabs.requestDirection({ direction: model.tabs.direction === 'ltr' ? 'rtl' : 'ltr' }),
  ),
  ClickedMount: FluidTabsExampleBlock.makeFieldsStep(() => ({ isMounted: Boolean.not })),
})

const motion = createTargetMotionScope('tabs-forms')

const presentation = createPresentationContext({ reducedMotion: 'user' })

const view = FluidTabsExampleComposition.makeView((model, h) => ({
  title: 'Native Fluid Tabs',
  body: h.main(
    [h.Class('p-6')],
    [
      h.div(
        [
          h.Class(
            'flex gap-2 mb-4 [&_button]:p-[4px_8px] [&_button]:[border:1px_solid_var(--border)]',
          ),
        ],
        [
          Button.view(
            {
              onClick: Message.ClickedSelect(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('set-selected')], ['Selected']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedReject(),
              toView: (attributes) =>
                h.button(
                  [
                    ...attributes.button,
                    h.Id('set-reject'),
                    h.AriaPressed(String(model.isSelectionRejected)),
                  ],
                  ['Reject selection'],
                ),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedSize(),
              toView: (attributes) => h.button([...attributes.button, h.Id('set-size')], ['Size']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedShape(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('set-shape')], ['Shape']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedIcons(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('set-icons')], ['Icons']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedActiveLabel(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('set-active-label')], ['Active label']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedDirection(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('set-direction')], ['Direction']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedMount(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('set-mount')], ['Mount']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedFirst(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('set-first')], ['First item']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedFocusPolicy(),
              toView: (attributes) =>
                h.button(
                  [...attributes.button, h.Id('set-focus-policy')],
                  ['Preserve input focus'],
                ),
            },
            h,
          ),
        ],
      ),
      Input.view(
        {
          id: 'tabs-command-input',
          placeholder: 'Arrow keys select without leaving this input',
          toView: (attributes) =>
            h.input([
              ...attributes.input,
              h.AriaLabel('Command filter'),
              h.OnKeyDownPreventDefault((key) =>
                key === 'ArrowLeft' || key === 'ArrowRight'
                  ? Option.some(
                      Message.PressedNavigationKey({
                        direction: key === 'ArrowLeft' ? 'Left' : 'Right',
                      }),
                    )
                  : Option.none(),
              ),
            ]),
        },
        h,
      ),
      ...(disabledActivity && !sourcePreset
        ? [h.p([], ['Activity is disabled in this accessibility test fixture.'])]
        : []),
      Button.view(
        {
          toView: (attributes) => h.button([...attributes.button, h.Id('before-tabs')], ['Before']),
        },
        h,
      ),
      h.div(
        [h.Class('w-125 m-[16px_0]'), h.Id('tabs-fixture')],
        [
          model.isMounted
            ? h.block(
                Tabs.embedView({
                  slotId: model.tabs.id,
                  model: model.tabs,
                  viewInputs: {
                    items: visibleItems(model.isFirstItemVisible).map(({ value, disabled }) => ({
                      value,
                      disabled,
                    })),
                    context: presentation,
                    focusOnClick: !model.shouldPreserveInput,
                    size: model.isCompact ? 'compact' : 'default',
                    shape: model.shape,
                    animate: motion.node,
                    content: (context) =>
                      visibleItems(model.isFirstItemVisible).map((item, index) => {
                        const label = item.value
                        const icon = model.hasIcons ? icons[item.iconIndex] : undefined

                        return TabsItem(
                          icon === undefined ? { label, index } : { label, index, icon },
                          context,
                          h,
                        )
                      }),
                  },
                }),
              )
            : null,
        ],
      ),
      Button.view(
        { toView: (attributes) => h.button([...attributes.button, h.Id('after-tabs')], ['After']) },
        h,
      ),
      h.output(
        [h.Class('block text-[12px] m-[12px_0]'), h.Id('tabs-state')],
        [
          JSON.stringify({
            selected: model.tabs.selectedIndex,
            selections: model.selections,
            reject: model.isSelectionRejected,
            focus: model.tabs.focusedIndex,
            measured: model.tabs.hover.isMeasured,
            rects: model.tabs.hover.itemRects.length,
            hovered: model.tabs.hover.activeIndex,
          }),
        ],
      ),
      ...(withPanels
        ? visibleItems(model.isFirstItemVisible).map((item, index) =>
            TabsPanel(
              {
                index,
                idPrefix: 'example',
                selectedIndex: model.tabs.selectedIndex,
                children: [item.value],
              },
              h,
            ),
          )
        : []),
    ],
  ),
}))

const layer = FluidTabsExampleBlock.makeLayer({ init, update, view }).pipe(Layer.provide(TabsLayer))

Runtime.run(
  Program.make({
    block: FluidTabsExampleBlock,
    layer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }).provide(motion.layer),
)
