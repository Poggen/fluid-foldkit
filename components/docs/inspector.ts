// Inspired by Fluid Functionalism's InspectOverlay. MIT, copyright 2026 Micka Touillaud.
import { Effect, Layer, Queue, Schema, Stream } from 'effect'
import { Block, Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { SwitchBlock, SwitchLayer, type SwitchViewInputs } from '@foldkit-visuals/fluid/switch'
import type { Presentation } from '@foldkit-visuals/fluid/presentation'

const Measurement = Schema.Struct({
  element: Schema.String,
  width: Schema.Finite,
  height: Schema.Finite,
  left: Schema.Finite,
  top: Schema.Finite,
  padding: Schema.String,
  gap: Schema.String,
  font: Schema.String,
  background: Schema.String,
  radius: Schema.String,
})
type Measurement = typeof Measurement.Type
const key = Symbol('DocumentationInspector')
export const InspectorBlock = Block.make('DocumentationInspector', {
  key,
  InitArgs: Schema.Tuple([Schema.String]),
  ChildInitContext: Schema.String,
  Model: Schema.Struct({
    enabled: Schema.Boolean,
    toggle: SwitchBlock.Model,
    measurement: Schema.NullOr(Measurement),
  }),
  Message: defineMessageUnion({
    Observed: { measurement: Measurement },
  }),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<
      Presentation & { readonly animate: SwitchViewInputs['animate'] }
    >(),
  },
})
const Observe = InspectorBlock.makeMountStream('ObservePreview', {
  messages: [InspectorBlock.Message.Observed],
  // oxlint-disable-next-line require-yield -- Foldkit mount constructors use generators, including service-free observers.
  *handler() {
    return ({ element, viewStateChanges }) =>
      viewStateChanges.pipe(
        Stream.switchMap((state) =>
          state === 'Paused'
            ? Stream.never
            : Stream.callback<typeof InspectorBlock.Message.Observed.Type>((queue) =>
                Effect.acquireRelease(
                  Effect.sync(() => {
                    const frame = element.closest('.reference-preview-card, .authored-frame')
                    if (frame === null) return () => {}
                    const document = element.ownerDocument
                    const window = document.defaultView
                    if (window === null) return () => {}
                    // Native manual popover keeps viewport geometry above transformed page motion.
                    const overlay = element instanceof HTMLElement ? element : null
                    overlay?.showPopover?.()
                    let current: Element | null = null
                    let previous = ''
                    const read = () => {
                      if (current === null || !current.isConnected) return
                      const bounds = current.getBoundingClientRect()
                      const style = window.getComputedStyle(current)
                      const measurement: Measurement = {
                        element:
                          current.tagName.toLowerCase() +
                          (current.getAttribute('role')
                            ? ` [${current.getAttribute('role')}]`
                            : ''),
                        width: Math.round(bounds.width * 10) / 10,
                        height: Math.round(bounds.height * 10) / 10,
                        left: bounds.left,
                        top: bounds.top,
                        padding: style.padding,
                        gap: style.gap,
                        font: `${style.fontSize} / ${style.lineHeight}`,
                        background: style.backgroundColor,
                        radius: style.borderRadius,
                      }
                      const serialized = JSON.stringify(measurement)
                      if (serialized === previous) return
                      previous = serialized
                      Queue.offerUnsafe(queue, InspectorBlock.Message.Observed({ measurement }))
                    }
                    const resize = new window.ResizeObserver(read)
                    const inspectTarget = (target: EventTarget | null) => {
                      if (!(target instanceof Element)) return
                      const panel = target.closest('[role="tabpanel"]')
                      if (
                        panel === null ||
                        !frame.contains(panel) ||
                        panel.classList.contains('hidden')
                      )
                        return
                      if (target === current) return
                      resize.disconnect()
                      current = target
                      resize.observe(target)
                      read()
                    }
                    const inspect = (event: Event) => inspectTarget(event.target)
                    frame.addEventListener('pointerover', inspect)
                    frame.addEventListener('focusin', inspect)
                    window.addEventListener('scroll', read, true)
                    window.addEventListener('resize', read)
                    // Focus may precede deferred acquisition or survive a paused view.
                    inspectTarget(document.activeElement)
                    return () => {
                      overlay?.hidePopover?.()
                      resize.disconnect()
                      frame.removeEventListener('pointerover', inspect)
                      frame.removeEventListener('focusin', inspect)
                      window.removeEventListener('scroll', read, true)
                      window.removeEventListener('resize', read)
                    }
                  }),
                  (release) => Effect.sync(release),
                ).pipe(Effect.flatMap(() => Effect.never)),
              ),
        ),
      )
  },
})
const ToggleRequests = InspectorBlock.makeRequiredFieldBinding(SwitchBlock, {
  field: 'toggle',
  init: { contextToArgs: (id) => [{ id, checked: false }] },
})
const Toggle = ToggleRequests.withOutMessagePolicy({
  fold: InspectorBlock.makeOutMessageFold(SwitchBlock, {
    Toggled: () =>
      InspectorBlock.makeStep((model) =>
        Update.combineSteps([
          ToggleRequests.requestConfigure({ checked: !model.enabled, disabled: false }),
          InspectorBlock.makeFieldsStep(() => ({
            enabled: () => !model.enabled,
            measurement: () => null,
          })),
        ]),
      ),
  }),
})
const InspectorComposition = InspectorBlock.makeComposition({
  mounts: [Observe],
  bindings: [Toggle],
})
export const layer = InspectorBlock.makeLayer({
  init: InspectorComposition.makeInit((id) => ({
    model: { enabled: false, measurement: null },
    childInitContext: id,
  })),
  update: InspectorComposition.makeUpdate({
    Observed: InspectorBlock.makeFieldsStep.fromMessage(({ measurement }) => ({
      measurement: () => measurement,
    })),
  }),
  view: InspectorComposition.makeView.withInputs((model, presentation, h) => {
    const measurement = model.measurement
    return h.div(
      [h.Class('ml-auto flex items-center gap-2')],
      [
        h.block(
          Toggle.embedView({
            slotId: 'inspect-toggle',
            model: model.toggle,
            viewInputs: {
              ...presentation,
              label: 'Inspect',
              layout: 'inline',
            },
          }),
        ),
        ...(model.enabled
          ? [
              h.div(
                [
                  h.OnMount(Observe()),
                  h.Popover('manual'),
                  h.Class(
                    'fixed inset-0 m-0 h-full w-full overflow-visible border-0 bg-transparent p-0 pointer-events-none',
                  ),
                ],
                [
                  h.div(
                    [
                      h.Role('status'),
                      h.Class(
                        'fixed bottom-4 right-4 z-[100] max-w-sm rounded-lg bg-surface-3 shadow-surface-3 p-3 font-mono text-[11px] leading-4 normal-case tracking-normal text-foreground',
                      ),
                    ],
                    measurement === null
                      ? ['Hover or focus a preview element to inspect its geometry and styles.']
                      : [
                          `${measurement.element} · ${measurement.width} × ${measurement.height}px`,
                          h.div([], [`Padding ${measurement.padding} · gap ${measurement.gap}`]),
                          h.div([], [`Type ${measurement.font} · radius ${measurement.radius}`]),
                          h.div([], [`Background ${measurement.background}`]),
                        ],
                  ),
                  ...(measurement === null
                    ? []
                    : [
                        h.div([
                          h.AriaHidden(true),
                          h.Class(
                            'fixed z-[90] pointer-events-none border border-fluid-accent bg-fluid-accent/10',
                          ),
                          h.Style({
                            left: `${measurement.left}px`,
                            top: `${measurement.top}px`,
                            width: `${measurement.width}px`,
                            height: `${measurement.height}px`,
                          }),
                        ]),
                      ]),
                ],
              ),
            ]
          : []),
      ],
    )
  }),
  EffectsLayer: Observe.layer,
}).pipe(Layer.provide(SwitchLayer))
