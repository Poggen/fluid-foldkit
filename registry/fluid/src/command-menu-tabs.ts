// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Effect, Queue, Schema, Stream, Layer } from 'effect'
import { Block, Update } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { Presentation, PresentationContext } from './presentation.js'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { HoverMode } from './hover.js'
import { TabsBlock, layer as TabsLayer } from './tabs.js'
import { TabsItem } from './tabs-parts.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import { cn } from './lib/utils.js'
import { CommandMenuTab, CommandMenuTabsConfig } from './command-menu-tabs-contracts.js'
import type { CommandMenuTabsViewInputs } from './command-menu-tabs-contracts.js'
import { observeCommandMenuTabs } from './command-menu-tabs-observer.js'

export {
  CommandMenuTab,
  CommandMenuTabsConfig,
  type CommandMenuTabsViewInputs,
} from './command-menu-tabs-contracts.js'

const Model = Schema.Struct({
  tabs: TabsBlock.Model,
  items: Schema.Array(CommandMenuTab),
  value: Schema.String,
  inputId: Schema.String,
})

const Message = defineMessageUnion({
  PressedNavigationKey: { direction: Schema.Literals(['left', 'right']) },
})

const OutMessage = defineMessageUnion({ ValueChanged: { value: Schema.String } })

const InMessage = defineInMessageUnion({
  RequestedConfigureValue: { value: Schema.String },
  RequestedHoverMode: { mode: HoverMode },
})

const effects = Block.makeEffectsContract()

export const CommandMenuTabsKey = Symbol('CommandMenuTabs')

export const CommandMenuTabsBlock = Block.make('CommandMenuTabs', {
  key: CommandMenuTabsKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([CommandMenuTabsConfig]),
  ChildInitContext: CommandMenuTabsConfig,
  view: { kind: 'Element', Inputs: Block.makeInputContract<CommandMenuTabsViewInputs>() },
  effects,
})

const Tabs = CommandMenuTabsBlock.makeRequiredFieldBinding(TabsBlock, {
  field: 'tabs',
  init: {
    contextToArgs: (config: CommandMenuTabsConfig) => [
      {
        id: config.id,
        hoverMode: config.hoverMode ?? 'fluid',
        selectedIndex: Math.max(
          0,
          config.tabs.findIndex((tab) => tab.value === config.value),
        ),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: CommandMenuTabsBlock.makeOutMessageFold(TabsBlock, {
    Selected: ({ index }) =>
      CommandMenuTabsBlock.makeStep((model) => {
        const tab = model.items[index]

        return tab === undefined
          ? { model }
          : { model, outMessage: OutMessage.ValueChanged({ value: tab.value }) }
      }),
  }),
})

const Observe = CommandMenuTabsBlock.makeMountStream('Observe', {
  args: { inputId: Schema.String },
  messages: [Message.PressedNavigationKey],
})

const ObserveLayer = Observe.toLayer(
  Effect.succeed(({ element, inputId, viewStateChanges }) =>
    viewStateChanges.pipe(
      Stream.switchMap((state) =>
        state === 'Live'
          ? Stream.callback<typeof Message.PressedNavigationKey.Type>((queue) =>
              Effect.acquireRelease(
                Effect.sync(() =>
                  observeCommandMenuTabs(element, inputId, (direction) => {
                    Queue.offerUnsafe(queue, Message.PressedNavigationKey({ direction }))
                  }),
                ),
                (release) => Effect.sync(release),
              ),
            )
          : Stream.never,
      ),
    ),
  ),
)

const CommandMenuTabsComposition = CommandMenuTabsBlock.makeComposition({
  bindings: [Tabs],
  mounts: [Observe],
})

const init = CommandMenuTabsComposition.makeInit((config: CommandMenuTabsConfig) => ({
  childInitContext: config,
  model: { items: config.tabs, value: config.value, inputId: config.inputId },
}))

const update = CommandMenuTabsComposition.makeUpdate({
  PressedNavigationKey: (model, { direction }) =>
    Tabs.requestNavigate({
      direction: direction === 'right' ? 'Right' : 'Left',
      items: model.items,
      focus: false,
    })(model),
})

const inMessageUpdate = CommandMenuTabsComposition.makeInMessageUpdate({
  RequestedHoverMode: CommandMenuTabsBlock.makeStep.fromMessage(
    ({ mode }: typeof InMessage.RequestedHoverMode.Type) => Tabs.requestHoverMode({ mode }),
  ),
  RequestedConfigureValue: CommandMenuTabsBlock.makeStep(
    (model, { value }: typeof InMessage.RequestedConfigureValue.Type) =>
      Update.combineSteps([
        CommandMenuTabsBlock.makeFieldsStep(() => ({ value: () => value })),
        Tabs.requestSelected({
          selectedIndex: Math.max(
            0,
            model.items.findIndex((tab) => tab.value === value),
          ),
        }),
      ]),
  ),
})

const view = CommandMenuTabsComposition.makeView.withInputs((model, inputs, h) => {
  const compact = resolvePresentation(inputs).size.variant === 'compact'

  return h.div(
    [
      h.DataAttribute('slot', 'command-menu-tabs'),
      h.Class(
        cn('flex shrink-0 items-center', compact ? 'gap-1 px-2 pb-1.5' : 'gap-2 px-2.5 pb-2'),
      ),
      h.OnMount(Observe({ inputId: model.inputId })),
    ],
    [
      h.div(
        [h.Class('flex min-w-0 flex-1 items-center')],
        [
          h.block(
            Tabs.embedView({
              slotId: 'tabs',
              model: model.tabs,
              viewInputs: {
                ariaLabel: 'Filter results',
                ...inputs,
                size: 'compact',
                items: model.items,
                focusOnClick: false,
                content: (context) =>
                  model.items.map((tab, index) =>
                    TabsItem(
                      inputs.iconFor === undefined
                        ? { index, label: tab.label }
                        : { index, label: tab.label, icon: inputs.iconFor(tab.value) },
                      context,
                      h,
                    ),
                  ),
              },
            }),
          ),
        ],
      ),
      ...(inputs.filters === undefined
        ? []
        : [
            h.div(
              [h.Class('ml-auto flex shrink-0 items-center')],
              [inputs.filters(createPresentationContext(inputs))],
            ),
          ]),
    ],
  )
})

export const CommandMenuTabsLayer = CommandMenuTabsBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: ObserveLayer,
}).pipe(Layer.provide(TabsLayer))

export function CommandMenuFilters<Message>(
  props: Presentation & {
    readonly inTabsRow?: boolean
    readonly className?: string
    readonly children: (context: PresentationContext) => ReadonlyArray<Html>
  },
  h: HtmlBuilder<Message>,
): Html {
  const compact = resolvePresentation(props).size.variant === 'compact'

  return h.div(
    [
      h.DataAttribute('slot', 'command-menu-filters'),
      h.Class(
        cn(
          'flex shrink-0 items-center gap-1 [&_[role=combobox]]:w-auto [&_[role=combobox]]:min-w-0',
          props.inTabsRow !== true && 'flex-wrap',
          props.inTabsRow !== true && (compact ? 'px-2 pb-1.5' : 'px-2.5 pb-2'),
          props.className,
        ),
      ),
    ],
    [
      ...props.children(
        createPresentationContext({ ...props, size: 'compact', hasSizeProvider: true }),
      ),
    ],
  )
}
