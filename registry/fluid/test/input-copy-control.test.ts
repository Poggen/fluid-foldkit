// @vitest-environment happy-dom
import { it } from '@effect/vitest'
import { Effect, Layer, Schedule, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { expect, vi } from 'vitest'
import {
  InputCopyControlBlock,
  controlLayer,
  createInputCopyControlLayer,
} from '../src/input-copy.js'

const Message = defineMessageUnion({ Variant: {} })
const ConsumerKey = Symbol('InputCopyControlConsumer')
const Consumer = Block.make('InputCopyControlConsumer', {
  key: ConsumerKey,
  InitArgs: Schema.Tuple([]),
  Model: Schema.Struct({ copy: InputCopyControlBlock.Model, copied: Schema.Natural }),
  Message,
  view: { kind: 'Element' },
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof InputCopyControlBlock>['programRequirements']
  >(),
})
const CopyBinding = Consumer.makeRequiredFieldBinding(InputCopyControlBlock, {
  field: 'copy',
  init: { contextToArgs: () => [{ id: 'default-copy', value: 'invitation' }] },
}).withOutMessagePolicy({
  fold: Consumer.makeOutMessageFold(InputCopyControlBlock, {
    Copied: () => Consumer.makeFieldsStep(() => ({ copied: (count) => count + 1 })),
  }),
})
const Composition = Consumer.makeComposition({ bindings: [CopyBinding] })
const layer = Consumer.makeLayer({
  init: Composition.makeInit(() => ({ model: { copied: 0 } })),
  update: Composition.makeUpdate({
    Variant: Consumer.makeStep((model) =>
      CopyBinding.requestConfigure({
        value: 'invitation',
        disabled: false,
        variant: model.copy.copy.variant === 'icon' ? 'button' : 'icon',
      }),
    ),
  }),
  view: Composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.block(
          CopyBinding.embedView({
            slotId: 'copy',
            model: model.copy,
            viewInputs: { label: 'Invitation', reducedMotion: 'always' },
          }),
        ),
        h.button([h.Id('variant'), h.OnClick(Message.Variant())], ['Variant']),
        h.output([], [`Copies: ${model.copied}`]),
      ],
    ),
  ),
}).pipe(Layer.provide(controlLayer))

const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 80, schedule: Schedule.spaced('20 millis') }))

it.live('default composition owns Tooltip feedback, rearming, variants and cleanup', () =>
  Effect.gen(function* () {
    const animation = Object.getOwnPropertyDescriptor(Element.prototype, 'animate')
    if (animation === undefined || !Reflect.deleteProperty(Element.prototype, 'animate')) {
      throw new Error('Test requires scoped WAAPI capability removal')
    }
    const write = vi.fn((_value: string) => Promise.resolve())
    const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: write },
    })
    const host = document.createElement('div')
    const container = document.createElement('div')
    container.id = 'input-copy-control-test'
    host.append(container)
    document.body.append(host)
    const handle = Runtime.embed(
      Program.makeElement({ block: Consumer, layer, container }).provide(
        createInputCopyControlLayer(document, navigator, window),
      ),
    )
    const button = () => {
      const element = host.querySelector<HTMLButtonElement>('#default-copy-button')
      if (element === null) throw new Error('Missing InputCopy button')
      return element
    }
    const popup = () => document.getElementById('default-copy-copy-tooltip-popup')
    const enter = () => {
      host.querySelector('#default-copy')?.dispatchEvent(new MouseEvent('mouseenter'))
      button().dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
      button().dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', movementX: 1 }),
      )
    }
    try {
      yield* eventually(() => expect(button().textContent).toContain('invitation'))
      yield* eventually(() => {
        enter()
        expect(popup()?.textContent).toBe('Copy to clipboard')
      })
      button().dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }),
      )
      button().click()
      yield* eventually(() => {
        expect(write).toHaveBeenCalledWith('invitation')
        expect(host.querySelector('output')?.textContent).toBe('Copies: 1')
        expect(popup()?.textContent).toBe('Copied')
        expect(button().getAttribute('aria-label')).toBe('Copied')
        expect(button().textContent).toContain('invitation')
      })
      host.querySelector('#default-copy')?.dispatchEvent(new MouseEvent('mouseleave'))
      yield* eventually(() => expect(popup()).toBeNull())
      yield* eventually(() => {
        enter()
        expect(popup()?.textContent).toBe('Copy to clipboard')
      })
      host.querySelector<HTMLButtonElement>('#variant')?.click()
      yield* eventually(() => {
        expect(button().hasAttribute('data-tooltip-trigger')).toBe(false)
        expect(popup()).toBeNull()
      })
      host.querySelector<HTMLButtonElement>('#variant')?.click()
      yield* eventually(() => expect(button().hasAttribute('data-tooltip-trigger')).toBe(true))
      yield* eventually(() => {
        enter()
        expect(popup()?.textContent).toBe('Copy to clipboard')
      })
    } finally {
      yield* Effect.promise(handle.dispose.bind(handle))
      host.remove()
      Object.defineProperty(Element.prototype, 'animate', animation)
      if (clipboard === undefined) Reflect.deleteProperty(navigator, 'clipboard')
      else Object.defineProperty(navigator, 'clipboard', clipboard)
    }
    expect(popup()).toBeNull()
  }),
)
