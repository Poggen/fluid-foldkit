import { modifyFields } from 'foldkit/struct'
import { observeMenuResultsHeight } from './menu-results-height.js'
import { anchorSetup } from '@foldkit/ui/anchor'
import { Effect, Layer, Option, Queue, Schema, Stream } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import type { Html } from 'foldkit/html'
import { DialogResources } from './dialog-resources.js'
import type { TargetMotionOptions as MotionOptions } from './motion-target.js'
import { spring, exitFallbackMs } from './lib/springs.js'
import { popupMotionClass } from './lib/popup.js'
import { popupShape } from './lib/shape.js'
import { cn } from './lib/utils.js'
import { Elevated } from './elevated.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { Presentation, PresentationContext } from './presentation.js'
const Model = Schema.Struct({
  id: Schema.String,
  anchorId: Schema.String,
  rootId: Schema.String,
  parentId: Schema.OptionFromNullOr(Schema.String),
  open: Schema.Boolean,
  retained: Schema.Boolean,
  generation: Schema.Natural,
})
const Message = defineMessageUnion({
  Dismissed: {},
  RowsChanged: { values: Schema.Array(Schema.String) },
  CompletedExit: { generation: Schema.Natural },
})
const OutMessage = defineMessageUnion({
  Dismissed: {},
  RowsChanged: { values: Schema.Array(Schema.String) },
})
const InMessage = defineInMessageUnion({ RequestedVisibility: { open: Schema.Boolean } })
const effects = Block.makeEffectsContract<never, DialogResources>()
export const ComboboxPopupKey = Symbol('ComboboxPopup')
export const ComboboxPopupBlock = Block.make('ComboboxPopup', {
  key: ComboboxPopupKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      id: Schema.String,
      anchorId: Schema.String,
      rootId: Schema.optionalKey(Schema.String),
      parentId: Schema.optionalKey(Schema.String),
    }),
  ]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ComboboxPopupViewInputs>() },
  effects,
})
const Definition = ComboboxPopupBlock
const Observe = Definition.makeMountStream('Observe', {
  args: {
    id: Schema.String,
    anchorId: Schema.String,
    rootId: Schema.String,
    parentId: Schema.OptionFromNullOr(Schema.String),
  },
  messages: [Message.Dismissed, Message.RowsChanged, Message.CompletedExit],
  *handler() {
    const resources = yield* DialogResources
    return ({ element, viewStateChanges, id, anchorId, rootId, parentId }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Live'
            ? Stream.callback<
                | typeof Message.Dismissed.Type
                | typeof Message.RowsChanged.Type
                | typeof Message.CompletedExit.Type
              >((queue) =>
                Effect.gen(function* () {
                  const document = element.ownerDocument
                  const window = document.defaultView
                  if (window === null || !(element instanceof window.HTMLElement)) {
                    return yield* Effect.die(new Error('Combobox popup requires HTML'))
                  }
                  const anchor = document.querySelector(`[id="${CSS.escape(anchorId)}"]`)
                  if (!(anchor instanceof window.HTMLElement)) {
                    return yield* Effect.die(new Error('Combobox anchor is missing'))
                  }
                  yield* Effect.acquireRelease(
                    Effect.sync(() =>
                      anchorSetup(element, {
                        buttonId: anchorId,
                        anchor: { placement: 'bottom-start', gap: 6, portal: true },
                        interceptTab: false,
                        focusAfterPosition: false,
                      }),
                    ),
                    (release) => Effect.sync(release),
                  )
                  const input = anchor.querySelector('input[role=combobox]')
                  if (!(input instanceof window.HTMLElement)) {
                    return yield* Effect.die(new Error('Combobox input is missing'))
                  }
                  const branch = {
                    id,
                    rootId,
                    parentId: Option.getOrUndefined(parentId),
                    host: element,
                    panel: element,
                    trigger: anchor,
                    isOpen: () => element.dataset.comboOpen === 'true',
                    requestClose: () => {
                      Queue.offerUnsafe(queue, Message.Dismissed())
                    },
                  }
                  yield* resources.registerBranch({
                    ...branch,
                    accessibleReferences: [
                      input,
                      ...anchor.querySelectorAll<HTMLElement>('[data-combo-dismiss]'),
                    ],
                  })
                  yield* Effect.acquireRelease(
                    Effect.sync(() => {
                      const releaseResults = observeMenuResultsHeight(
                        element,
                        '[data-combo-value]',
                        'surface',
                      )
                      let previous = ''
                      const publishAvailableHeight = () => {
                        const side = element.getAttribute('data-placement')
                        if (side !== null && element.getAttribute('data-side') !== side) {
                          element.setAttribute('data-side', side)
                        }
                        const availableHeight = element.style.maxHeight
                        if (
                          availableHeight &&
                          element.style.getPropertyValue('--available-height') !== availableHeight
                        ) {
                          element.style.setProperty('--available-height', availableHeight)
                        }
                      }
                      const bounds = new window.MutationObserver(publishAvailableHeight)
                      bounds.observe(element, {
                        attributes: true,
                        attributeFilter: ['style', 'data-placement'],
                      })
                      publishAvailableHeight()
                      const read = () => {
                        const values = [
                          ...element.querySelectorAll<HTMLElement>('[data-combo-value]'),
                        ].map((row) => row.dataset.comboValue ?? '')
                        const next = JSON.stringify({
                          open: element.dataset.comboOpen,
                          values,
                          disabled: [...element.querySelectorAll('[data-combo-value]')].map((row) =>
                            row.getAttribute('aria-disabled'),
                          ),
                        })
                        if (next !== previous) {
                          previous = next
                          Queue.offerUnsafe(queue, Message.RowsChanged({ values }))
                        }
                      }
                      const observer = new window.MutationObserver(read)
                      observer.observe(element, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['data-combo-value', 'data-combo-open', 'aria-disabled'],
                      })
                      const pointer = (event: Event) => {
                        if (
                          event.target instanceof window.Element &&
                          event.target.closest('[data-combo-value]')
                        ) {
                          event.preventDefault()
                        }
                      }
                      const completed = (event: Event) => {
                        if (!(event instanceof window.CustomEvent)) {
                          return
                        }
                        const detail: unknown = event.detail
                        if (!Schema.is(Schema.Finite)(detail) || !Number.isSafeInteger(detail)) {
                          return
                        }
                        Queue.offerUnsafe(queue, Message.CompletedExit({ generation: detail }))
                      }
                      element.addEventListener('fluid-combobox-exit', completed)
                      element.addEventListener('pointerdown', pointer)
                      read()
                      return () => {
                        releaseResults()
                        observer.disconnect()
                        bounds.disconnect()
                        element.removeEventListener('fluid-combobox-exit', completed)
                        element.removeEventListener('pointerdown', pointer)
                      }
                    }),
                    (release) => Effect.sync(release),
                  )
                  return yield* Effect.never
                }),
              )
            : Stream.never,
        ),
      )
  },
})
const FinishExit = Definition.makeCommand('FinishExit', {
  args: { generation: Schema.Natural },
  messages: [Message.CompletedExit],
  *handler() {
    return ({ generation }) =>
      Effect.sleep(exitFallbackMs(spring.fast)).pipe(
        Effect.as(Message.CompletedExit({ generation })),
      )
  },
})
const Composition = Definition.makeComposition({ mounts: [Observe] })
export interface ComboboxPopupConfig {
  readonly id: string
  readonly anchorId: string
  readonly rootId?: string
  readonly parentId?: string
}
const init = Composition.makeInit((config: ComboboxPopupConfig) => ({
  model: {
    id: config.id,
    anchorId: config.anchorId,
    rootId: config.rootId ?? config.id,
    parentId: Option.fromUndefinedOr(config.parentId),
    open: false,
    retained: false,
    generation: 0,
  },
}))
const update = Composition.makeUpdate({
  Dismissed: (model) => (model.open ? { model, outMessage: OutMessage.Dismissed() } : { model }),
  RowsChanged: (model, { values }) => ({ model, outMessage: OutMessage.RowsChanged({ values }) }),
  CompletedExit: (model, { generation }) => ({
    model:
      generation === model.generation && !model.open
        ? modifyFields(model, { retained: () => false })
        : model,
  }),
})
const inMessageUpdate = Composition.makeInMessageUpdate({
  RequestedVisibility: (model, { open }) => {
    const generation = model.open === open ? model.generation : model.generation + 1
    return {
      model: modifyFields(model, {
        open: () => open,
        retained: (currentRetained) => open || currentRetained,
        generation: () => generation,
      }),
      commands: !open && model.retained ? [FinishExit({ generation })] : [],
    }
  },
})
export interface ComboboxPopupViewInputs extends Presentation {
  readonly content: (context: PresentationContext) => ReadonlyArray<Html>
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly className?: string
}
const view = Composition.makeView.withInputs<ComboboxPopupViewInputs>((model, inputs, h) =>
  model.retained
    ? h.keyed('div')(
        model.id,
        [
          h.Class(cn('z-[var(--z-popover,60)] outline-none', 'absolute overflow-visible!')),
          h.Id(model.id),
          h.DataAttribute('combo-open', String(model.open)),
          h.Style({
            '--anchor-width': 'var(--button-width)',
            pointerEvents: model.open ? 'auto' : 'none',
          }),
          h.OnMount(
            Observe({
              id: model.id,
              anchorId: model.anchorId,
              rootId: model.rootId,
              parentId: model.parentId,
            }),
          ),
        ],
        [
          inputs.animate(
            Elevated(
              {
                context: createPresentationContext(inputs),
                offset: 2,
                shadowLevel: 3,
                attributes: [h.DataAttribute('combo-surface', '')],
                className: cn(
                  `flex flex-col min-w-[var(--anchor-width)] max-h-[min(300px,var(--available-height))] overflow-hidden ${popupShape(resolvePresentation(inputs).shape.variant).container} select-none outline-none`,
                  popupMotionClass,
                  inputs.className,
                ),
                children: (context) => [
                  ...inputs.content(context),
                  h.button([
                    h.Type('button'),
                    h.Tabindex(-1),
                    h.AriaLabel('Dismiss'),
                    h.Class('sr-only'),
                    h.OnClick(Message.Dismissed()),
                  ]),
                ],
              },
              h,
            ),
            {
              initial: { opacity: 0, y: 'var(--popup-enter-y)', scaleY: 0.96 },
              animate: model.open
                ? { opacity: 1, y: 0, scaleY: 1 }
                : { opacity: 0, y: 'var(--popup-enter-y)', scaleY: 0.96 },
              transition: model.open ? spring.fast : spring.fast.exit,
              onAnimationComplete: (element) => {
                const window = element.ownerDocument.defaultView
                if (!model.open && window !== null) {
                  element.dispatchEvent(
                    new window.CustomEvent('fluid-combobox-exit', {
                      bubbles: true,
                      detail: model.generation,
                    }),
                  )
                }
              },
            },
          ),
        ],
      )
    : h.empty,
)
const implementation = {
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Layer.merge(Observe.layer, FinishExit.layer),
}
export const layer = ComboboxPopupBlock.makeLayer<typeof implementation>(implementation)

export const test = { FinishExit }
