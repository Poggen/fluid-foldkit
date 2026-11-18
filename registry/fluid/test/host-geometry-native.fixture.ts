import { Layer, Option, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { HTMLVisualElement } from 'motion-dom'
import { TabsBlock, TabsItem, layer as PrimaryLayer } from '../src/tabs.js'
import { defaultIcons } from '../src/icons.js'
import { createPresentationContext } from '../src/presentation.js'
import { ComboboxPopupBlock, layer as PopupLayer } from '../src/combobox-popup.js'
import { DialogResourcesLayer } from '../src/dialog-resources.js'
import { accordionPanelMotion } from '../src/accordion-panel-motion.js'
import { thinkingCollapseMotion } from '../src/thinking-collapse-motion.js'
import { sidebarGroupMotion, sidebarMenuSubMotion } from '../src/sidebar-group-motion.js'

const container = document.getElementById('style-contract-root')
if (!(container instanceof HTMLElement)) throw new Error('Missing native geometry fixture root')
const controls = document.createElement('aside')
controls.style.cssText =
  'position:fixed;right:0;top:0;z-index:9999;display:flex;flex-direction:column;max-height:100vh;overflow:auto;background:white'
document.body.append(controls)
const button = (name: string, action: () => void) => {
  const control = document.createElement('button')
  control.textContent = name
  control.addEventListener('click', action)
  controls.append(control)
}

if (container.dataset.fixture === 'tabs') {
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
          model.accepts
            ? BarePrimary.requestSelected({ selectedIndex: index })
            : Root.makeNoopStep(),
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
          h.button(
            [h.Id('toggle-visible'), h.OnClick(Message.ToggleVisible())],
            ['Toggle visible'],
          ),
          h.button(
            [h.Id('toggle-reduced'), h.OnClick(Message.ToggleReduced())],
            ['Toggle reduced'],
          ),
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

  const runtime = Runtime.embed(
    Program.makeElement({ block: Root, layer, container, devTools: false }),
  )
  button('Dispose tabs', () => {
    void runtime.dispose()
  })
} else if (container.dataset.fixture === 'combobox') {
  const RootKey = Symbol('ComboboxPopupAnchor')
  const Message = defineMessageUnion({ Opened: {} })
  const Root = Block.make('ComboboxPopupAnchor', {
    key: RootKey,
    Model: Schema.Struct({ popup: ComboboxPopupBlock.Model }),
    Message,
    InitArgs: Schema.Tuple([]),
    effects: Block.makeEffectsContract<
      never,
      Block.FactsOf<typeof ComboboxPopupBlock>['programRequirements']
    >(),
    view: { kind: 'Element' },
  })
  const Popup = Root.makeRequiredFieldBinding(ComboboxPopupBlock, {
    field: 'popup',
    init: { contextToArgs: () => [{ id: 'anchor-popup', anchorId: 'anchor-field' }] },
  }).withOutMessagePolicy({
    fold: Root.makeOutMessageFold(ComboboxPopupBlock, {
      Dismissed: Root.makeNoopStep,
      RowsChanged: Root.makeNoopStep,
    }),
  })
  const Composition = Root.makeComposition({ bindings: [Popup] })
  const init = Composition.makeInit(() => ({ model: {} }))
  const update = Composition.makeUpdate({ Opened: Popup.requestVisibility({ open: true }) })
  const view = Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.div([h.Id('anchor-field')], [h.input([h.Role('combobox')])]),
        h.button([h.Id('open-anchor-popup'), h.OnClick(Message.Opened())], ['Open']),
        h.block(
          Popup.embedView({
            slotId: model.popup.id,
            model: model.popup,
            viewInputs: {
              animate: (node) => node,
              content: () => [h.div([h.DataAttribute('combo-value', 'first')], ['First item'])],
            },
          }),
        ),
      ],
    ),
  )
  const layer = Root.makeLayer({ init, update, view }).pipe(Layer.provide(PopupLayer))

  const runtime = Runtime.embed(
    Program.makeElement({ block: Root, layer, container, devTools: false }).provide(
      DialogResourcesLayer(document),
    ),
  )
  window.addEventListener(
    'dispose-native-combo',
    () => {
      void runtime.dispose()
    },
    { once: true },
  )
} else {
  for (const { name, resource, attribute, overflow } of [
    {
      name: 'accordion',
      resource: accordionPanelMotion,
      attribute: 'data-accordion-open',
      overflow: 'hidden',
    },
    {
      name: 'thinking',
      resource: thinkingCollapseMotion,
      attribute: 'data-thinking-open',
      overflow: 'hidden',
    },
    {
      name: 'sidebar',
      resource: sidebarGroupMotion,
      attribute: 'data-sidebar-group-open',
      overflow: 'visible',
    },
    {
      name: 'submenu',
      resource: sidebarMenuSubMotion,
      attribute: 'data-sidebar-sub-open',
      overflow: 'hidden',
    },
  ]) {
    const panel = document.createElement('div')
    panel.style.overflow = 'hidden'
    panel.dataset.nativeCollapse = name
    panel.dataset.settledOverflow = overflow
    const inner = document.createElement('div')
    inner.style.height = '124px'
    inner.textContent = name
    panel.append(inner)
    panel.setAttribute(attribute, 'true')
    panel.dataset.accordionGeneration = '0'
    panel.dataset.thinkingCompletion = 'native-thinking-complete'
    container.append(panel)
    const visual = new HTMLVisualElement({
      visualState: {
        latestValues: {},
        renderState: { style: {}, transform: {}, transformOrigin: {}, vars: {} },
      },
      props: { initial: false, animate: {} },
      presenceContext: null,
    })
    visual.mount(panel)
    const release = resource.mount(visual)
    button(`Resize ${name}`, () => {
      inner.style.height = '204px'
    })
    button(`Close ${name}`, () => {
      panel.dataset.accordionGeneration = '1'
      panel.setAttribute(attribute, 'false')
    })
    button(`Reopen ${name}`, () => {
      inner.style.height = '240px'
      panel.dataset.accordionGeneration = '2'
      panel.setAttribute(attribute, 'true')
    })
    button(`Dispose ${name}`, () => {
      release()
      visual.unmount()
      panel.remove()
    })
  }
}
