import { modifyFields } from 'foldkit/struct'
import { initialSelectedPill } from './tabs-selected-pill-state.js'
import {
  seedSelectedPill,
  SelectedPillInitializer,
  SelectedPillDriversLayer,
} from './tabs-selected-pill-driver.js'
import {
  SelectedPillMount,
  RetargetSelectedPill,
  SynchronizeSelectedPill,
  AdoptSelectedPillLease,
} from './tabs-selected-pill-effects.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { tabsDecorations, tabsExitAttribute } from './tabs-decorations.js'
import { Effect, Layer, Option, Schema, Struct } from 'effect'
import { Update } from 'foldkit'
import { SynchronizeSelection } from './tabs-selection-effects.js'
import { childAttributes } from 'foldkit/html'
import { HoverBlock, layer as HoverLayer } from './hover.js'
import type { HoverConfig } from './hover.js'
import { cn } from './lib/utils.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import {
  observeTabs,
  focusTabsItem,
  TabsObserverRoots,
  TabsObserverRootsLayer,
} from './tabs-observer.js'
import {
  TabsLogicalState,
  synchronizeTabsHighlights,
  synchronizeTabsLabels,
  navigationIndex,
} from './tabs-state.js'
import type { TabsContext } from './tabs-parts.js'

import type { InMessage } from './tabs-definition.js'
import { TabsBlock, Message, OutMessage } from './tabs-definition.js'

import type { TabsConfig } from './tabs-contract.js'

export { TabsBlock, TabsBlockKey, InMessage } from './tabs-definition.js'

export type { TabsConfig, TabsViewInputs } from './tabs-contract.js'

const ObserveTabs = TabsBlock.makeMountStream('ObserveTabs', {
  messages: [
    Message.CapturedMount,
    Message.CapturedItems,
    Message.CapturedMouse,
    Message.CapturedFocus,
    Message.CapturedBlur,
    Message.CapturedSelection,
  ],
  *handler() {
    const roots = yield* TabsObserverRoots

    return ({ element, viewStateChanges }) => observeTabs(element, viewStateChanges, roots)
  },
})

const SynchronizeHighlights = Update.combineSteps([
  TabsBlock.makeFieldsStep((model) => {
    const next = synchronizeTabsHighlights(model, model.hover)

    return {
      hoverSlot: () => next.hoverSlot,
      focusSlot: () => next.focusSlot,
      generation: () => next.generation,
    }
  }),
  SynchronizeSelectedPill,
])

const SynchronizeLabels = TabsBlock.makeFieldsStep((model) => {
  const next = synchronizeTabsLabels(model)

  return {
    labels: () => next.labels,
    hasItems: () => next.hasItems,
    generation: () => next.generation,
  }
})

const Hover = TabsBlock.makeRequiredFieldBinding(HoverBlock, {
  field: 'hover',
  init: {
    contextToArgs: (config: TabsConfig): [HoverConfig] => [
      {
        id: config.id,
        axis: 'x',
        gapClick: false,
        ...(config.hoverMode === undefined ? {} : { mode: config.hoverMode }),
      },
    ],
  },
}).withOutMessagePolicy({
  fold: TabsBlock.makeOutMessageFold(HoverBlock, {
    Changed: () => SynchronizeHighlights,
  }),
})

const TabsComposition = TabsBlock.makeComposition({
  bindings: [Hover],
  mounts: [ObserveTabs, SelectedPillMount],
})

const init = TabsComposition.makeInit((config: TabsConfig) => ({
  childInitContext: config,
  model: {
    ...TabsLogicalState.make({
      id: config.id,
      selectedIndex: config.selectedIndex,
      activeLabel: config.activeLabel ?? false,
      direction: config.direction ?? 'ltr',
      idPrefix: Option.fromUndefinedOr(config.idPrefix),
      focusedIndex: Option.none(),
      rovingIndex: Option.none(),
      focusRingIndex: Option.none(),
      mouseInside: false,
      items: [],
      labels: [],
      hasItems: false,
      generation: 0,
      hoverSlot: Option.none(),
      focusSlot: Option.none(),
    }),
    selectionGeneration: 0,
    ...initialSelectedPill,
  },
}))

const update = TabsComposition.makeUpdate({
  CapturedSelectedPillLease: AdoptSelectedPillLease,
  ObservedSelectedPillRetarget: TabsBlock.makeNoopStep(),
  CapturedMount: Update.combineSteps([
    TabsBlock.makeFieldsStep(() => ({
      selectionGeneration: (generation) => generation + 1,
      items: () => [],
      labels: () => [],
      hasItems: () => false,
      focusedIndex: () => Option.none(),
      rovingIndex: () => Option.none(),
      focusRingIndex: () => Option.none(),
      mouseInside: () => false,
      hoverSlot: () => Option.none(),
      focusSlot: () => Option.none(),
    })),
    Hover.requestClear(),
  ]),
  CapturedItems: TabsBlock.makeStep((model, { items }: typeof Message.CapturedItems.Type) =>
    Update.combineSteps([
      TabsBlock.makeFieldsStep(() => ({
        items: () =>
          items.map((item) => ({
            ...item,
            width: Option.orElse(
              item.width,
              () =>
                model.items.find((previous) => previous.index === item.index)?.width ??
                Option.none(),
            ),
          })),
      })),
      SynchronizeLabels,
    ]),
  ),
  CapturedMouse: TabsBlock.makeStep((_model, { inside }: typeof Message.CapturedMouse.Type) =>
    Update.combineSteps([
      TabsBlock.makeFieldsStep(() => ({ mouseInside: () => inside })),
      SynchronizeHighlights,
    ]),
  ),
  CapturedFocus: TabsBlock.makeStep(
    (_model, { index, visible }: typeof Message.CapturedFocus.Type) =>
      Update.combineSteps([
        TabsBlock.makeFieldsStep(() => ({
          focusedIndex: () => Option.some(index),
          selectionGeneration: (generation) => generation + 1,
          rovingIndex: () => Option.some(index),
          focusRingIndex: () => (visible ? Option.some(index) : Option.none()),
        })),
        Hover.requestHighlight({ index }),
        SynchronizeHighlights,
      ]),
  ),
  CapturedBlur: TabsBlock.makeStep((model, { inside }: typeof Message.CapturedBlur.Type) =>
    inside
      ? TabsBlock.makeNoopStep()
      : Update.combineSteps([
          TabsBlock.makeFieldsStep(() => ({
            focusedIndex: () => Option.none(),
            focusRingIndex: () => Option.none(),
          })),
          model.mouseInside ? TabsBlock.makeNoopStep() : Hover.requestClear(),
          SynchronizeHighlights,
        ]),
  ),
  CapturedSelection: (model, { index }) =>
    index === model.selectedIndex
      ? { model }
      : { model, outMessage: OutMessage.Selected({ index }) },
  CompletedFocus: TabsBlock.makeNoopStep(),
  ObservedSelectionTabStop: (model, { selectedIndex, generation, index }) => ({
    model:
      generation === model.selectionGeneration &&
      selectedIndex === model.selectedIndex &&
      Option.isSome(index)
        ? modifyFields(model, { rovingIndex: () => index })
        : model,
  }),
  CompletedHighlightExit: (model, { kind, generation }) => {
    const field = kind === 'hover' ? 'hoverSlot' : 'focusSlot'
    const slot = model[field]

    return {
      model:
        Option.isSome(slot) &&
        slot.value.phase === 'Exiting' &&
        slot.value.generation === generation
          ? kind === 'hover'
            ? modifyFields(model, { hoverSlot: () => Option.none() })
            : modifyFields(model, { focusSlot: () => Option.none() })
          : model,
    }
  },
  CompletedLabelExit: (model, { index, generation }) => ({
    model: modifyFields(model, {
      labels: (currentLabels) =>
        currentLabels.filter(
          (slot) =>
            !(slot.index === index && slot.phase === 'Exiting' && slot.generation === generation),
        ),
    }),
  }),
})

const FocusTab = TabsBlock.makeCommand('FocusTab', {
  args: { id: Schema.String, index: Schema.Int },
  messages: [Message.CompletedFocus],
  *handler() {
    const roots = yield* TabsObserverRoots

    return ({ id, index }) =>
      Effect.sync(() => {
        focusTabsItem(roots, id, index)

        return Message.CompletedFocus()
      })
  },
})

const inMessageUpdate = TabsComposition.makeInMessageUpdate({
  RequestedHoverMode: TabsBlock.makeStep.fromMessage(
    ({ mode }: typeof InMessage.RequestedHoverMode.Type) =>
      Hover.requestConfigure({
        options: { mode, axis: 'x', nearest: false, gapClick: false, maxDistance: Infinity },
      }),
  ),
  RequestedDirection: TabsBlock.makeFieldsStep(
    (_model, { direction }: typeof InMessage.RequestedDirection.Type) => ({
      direction: () => direction,
    }),
  ),
  RequestedSelected: TabsBlock.makeStep(
    (model, { selectedIndex }: typeof InMessage.RequestedSelected.Type) => {
      if (selectedIndex === model.selectedIndex) {
        return TabsBlock.makeNoopStep()
      }

      const generation = model.selectionGeneration + 1

      return Update.combineSteps([
        TabsBlock.makeFieldsStep(() => ({
          selectedIndex: () => selectedIndex,
          selectionGeneration: () => generation,
        })),
        SynchronizeLabels,
        SynchronizeHighlights,
        TabsBlock.makeStep((current) => ({
          model: current,
          commands: [SynchronizeSelection({ id: current.id, selectedIndex, generation })],
        })),
      ])
    },
  ),
  RequestedActiveLabel: TabsBlock.makeStep(
    (_model, { activeLabel }: typeof InMessage.RequestedActiveLabel.Type) =>
      Update.combineSteps([
        TabsBlock.makeFieldsStep(() => ({ activeLabel: () => activeLabel })),
        SynchronizeLabels,
      ]),
  ),
  RequestedNavigate: (model, { direction, items, focus }) => {
    const index = navigationIndex(items, model.selectedIndex, direction, model.direction)

    if (index === null) {
      return { model }
    }

    const commands = focus ? [FocusTab({ id: model.id, index })] : []

    return index === model.selectedIndex
      ? { model, commands }
      : { model, commands, outMessage: OutMessage.Selected({ index }) }
  },
})

const view = TabsComposition.makeView.withInputs((model, inputs, h) => {
  const presentation = resolvePresentation(inputs)

  const focused = Option.getOrUndefined(model.rovingIndex)

  let tabStop = model.selectedIndex

  if (focused !== undefined && inputs.items[focused] !== undefined) {
    tabStop = focused
  } else if (inputs.items[model.selectedIndex]?.disabled === true) {
    tabStop = 0
  }

  const itemMount = childAttributes([h.OnMount(ObserveTabs())])

  const baseContext: TabsContext = {
    measureLabel: (attributes, children) => h.span([...itemMount, ...attributes], children),
    itemDisabled: (index) => inputs.items[index]?.disabled === true,
    itemAttributes: (index) =>
      childAttributes([
        h.Type('button'),
        h.Role('tab'),
        h.Id(`${Option.getOrElse(model.idPrefix, () => model.id)}-tab-${index}`),
        h.AriaSelected(index === model.selectedIndex),
        h.Tabindex(index === tabStop ? 0 : -1),
        ...(inputs.items[index]?.disabled === true ? [h.AriaDisabled(true)] : []),
        ...(Option.isSome(model.idPrefix)
          ? [h.AriaControls(`${model.idPrefix.value}-panel-${index}`)]
          : []),
      ]),
    ...Struct.pick(inputs, ['shape', 'size', 'surface']),
    animate: inputs.animate,
    context: createPresentationContext({
      ...inputs,
      hasSizeProvider: inputs.size !== undefined || presentation.hasSizeProvider,
    }),
    id: model.id,
    selectedIndex: model.selectedIndex,
    hoveredIndex: model.hover.activeIndex,
    focusedIndex: Option.getOrNull(model.focusedIndex),
    activeLabel: model.activeLabel,
    labels: model.labels.map((state) => ({
      state,
      completion: childAttributes([
        tabsExitAttribute<typeof Message.Type>(
          Message.CompletedLabelExit({ index: state.index, generation: state.generation }),
        ),
      ]),
    })),
  }

  const context = Option.isSome(model.idPrefix)
    ? { ...baseContext, idPrefix: model.idPrefix.value }
    : baseContext

  const selectedPill = Option.isSome(model.selectedPill)
    ? seedSelectedPill(
        h.keyed('div')('selected', [
          h.Class(cn('absolute bg-active pointer-events-none', presentation.shape.bg)),
          h.DataAttribute('tabs-selected-pill', ''),
          h.DataAttribute('tabs-pill-reduced-motion', presentation.reducedMotion),
          h.DataAttribute(
            'tabs-pill-initializer',
            Schema.encodeSync(SelectedPillInitializer)({
              target: model.selectedPill.value,
              revision: model.selectedPillRevision,
              policy: presentation.reducedMotion,
            }),
          ),
          h.OnMount(SelectedPillMount({ id: model.id })),
        ]),
        model.selectedPill.value,
      )
    : null

  const decorations = tabsDecorations(model, h, {
    selectedPill,
    hoverMode: model.hover.mode,
    animate: inputs.animate,
    shape: presentation.shape,
    reducedMotion: presentation.reducedMotion,
    completion: (kind, generation) =>
      tabsExitAttribute<typeof Message.Type>(Message.CompletedHighlightExit({ kind, generation })),
  })

  return h.block(
    Hover.embedView({
      slotId: model.hover.id,
      model: model.hover,
      viewInputs: {
        attributes: [
          ...childAttributes([
            h.Role('tablist'),
            h.AriaOrientation('horizontal'),
            h.AriaLabel(inputs.ariaLabel ?? 'Tabs'),
            h.DataAttribute('tabs-id', model.id),
            h.DataAttribute('tabs-selected', String(tabStop)),
            h.DataAttribute('tabs-focus-on-click', String(inputs.focusOnClick ?? true)),
          ]),
          ...childAttributes([
            h.Dir(model.direction),
            h.DataAttribute('slot', 'fluid-tabs'),
            h.Class(
              cn(
                'relative flex items-center select-none overflow-x-auto max-w-[calc(100%_+_8px)] scrollbar-hide -mx-1 px-1 -my-1 py-1',
                inputs.className,
              ),
            ),
          ]),
          ...(inputs.attributes ?? []),
        ],
        content: () => [...decorations, ...inputs.content(context)],
      },
    }),
  )
})

export const layer = TabsBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Layer.mergeAll(
    ObserveTabs.layer,
    FocusTab.layer,
    SynchronizeSelection.layer,
    SelectedPillMount.layer,
    RetargetSelectedPill.layer,
  ).pipe(Layer.provide(Layer.mergeAll(TabsObserverRootsLayer, SelectedPillDriversLayer))),
}).pipe(Layer.provide(HoverLayer))

export { TabsItem, TabsPanel } from './tabs-parts.js'

export type { TabsItemProps, TabsPanelProps, TabsContext } from './tabs-parts.js'

export { TabsItemDescriptor } from './tabs-state.js'

export const hoverModeOf = (model: typeof TabsBlock.Model.Type) => model.hover.mode
