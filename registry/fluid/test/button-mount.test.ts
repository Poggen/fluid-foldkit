import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import { Block, Scene } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { renderToString } from 'foldkit/experimental/server'
import { inertHtml as h } from 'foldkit/html'
import { Button } from '../src/button.js'
import type { Icon } from '../src/presentation.js'

const Model = Schema.Struct({ mounted: Schema.Boolean })
const Message = defineMessageUnion({ Mounted: {} })
const ButtonMountOwnerKey = Symbol('ButtonMountOwner')
const effects = Block.makeEffectsContract()
const Definition = Block.make('ButtonMountOwner', {
  key: ButtonMountOwnerKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
  effects,
})
const Observe = Definition.makeMount('Observe', {
  messages: [Message.Mounted],
  handler: function* () {
    return ({ element }) =>
      Effect.sync(() => {
        if (element.tagName !== 'BUTTON') throw new Error('Expected the actual button')
        return Message.Mounted()
      })
  },
})
const Composition = Definition.makeComposition({ mounts: [Observe] })
const init = Composition.makeInit(() => ({ model: { mounted: false } }))
const update = Composition.makeUpdate({
  Mounted: (model) => ({ model: { ...model, mounted: true } }),
})
const view = Composition.makeView((_model, h) => ({
  title: 'Owned Button',
  body: Button({ attributes: [h.OnMount(Observe())], children: ['Owned button'] }, h),
}))
const layer = Definition.makeLayer({ init, update, view, EffectsLayer: Observe.layer })
const subject = { block: Definition, layer }

it.effect('Button preserves a registered parent mount without acquiring it during SSR', () =>
  Effect.gen(function* () {
    const result = yield* renderToString(subject, {}, { isHydratable: false })
    expect(result.html).toContain('<button')
    expect(result.html).toContain('Owned button')
    yield* Scene.scene(
      subject,
      Scene.init(),
      Scene.expect(Scene.role('button', { name: 'Owned button' })).toExist(),
      Scene.Mount.expectExact(Observe),
      Scene.Mount.resolve(Observe, Message.Mounted()),
    )
  }),
)

it('toolbar loading keeps the compact spinner and native busy control semantics', () => {
  const button = Button(
    {
      buttonSize: 'icon-toolbar',
      loading: true,
      attributes: [h.AriaLabel('New')],
      children: [h.svg([h.ViewBox('0 0 16 16')])],
    },
    h,
  )
  expect(button?.sel).toBe('button')
  expect(button?.data?.props).toMatchObject({ type: 'button', disabled: true })
  expect(button?.data?.attrs).toMatchObject({ 'aria-label': 'New', 'aria-busy': 'true' })
  const descendants: (node: typeof button) => ReadonlyArray<NonNullable<typeof button>> = (
    node: typeof button,
  ) =>
    node === null
      ? []
      : [
          node,
          ...(node.children ?? []).flatMap((child) =>
            typeof child === 'object' ? descendants(child) : [],
          ),
        ]
  const spinner = descendants(button).filter(
    (node) => node.sel === 'svg' && node.data?.attrs?.width !== undefined,
  )
  expect(spinner).toHaveLength(1)
  expect(spinner[0]?.data?.attrs).toMatchObject({ width: '14', height: '14' })
})

it.each(['icon', 'icon-compact', 'icon-toolbar'] as const)(
  '%s renders the supplied leading icon when children are empty',
  (buttonSize) => {
    const button = Button(
      {
        buttonSize,
        leadingIcon: (options, html) =>
          html.svg([html.Width(String(options.size)), html.DataAttribute('test-icon', 'leading')]),
        children: [],
      },
      h,
    )
    const content = button?.children?.[1]
    const wrapper = typeof content === 'object' ? content?.children?.[0] : undefined
    const icon = typeof wrapper === 'object' ? wrapper?.children?.[0] : undefined
    expect(typeof icon === 'object' ? icon?.sel : undefined).toBe('svg')
    expect(typeof icon === 'object' ? icon?.data?.attrs : undefined).toMatchObject({
      width: buttonSize === 'icon' ? '16' : '14',
      'data-test-icon': 'leading',
    })
  },
)

it('icon buttons preserve explicit children and accept a trailing icon fallback', () => {
  const icon: Icon = (options, html) => html.svg([html.Width(String(options.size))])
  const explicit = h.svg([h.DataAttribute('test-icon', 'explicit')])
  const contents = (button: ReturnType<typeof Button>) => {
    const content = button?.children?.[1]
    const wrapper = typeof content === 'object' ? content?.children?.[0] : undefined
    return typeof wrapper === 'object' ? wrapper?.children : undefined
  }
  expect(
    contents(Button({ buttonSize: 'icon', leadingIcon: icon, children: [explicit] }, h)),
  ).toEqual([explicit])
  const trailing = contents(
    Button({ buttonSize: 'icon', trailingIcon: icon, children: [] }, h),
  )?.[0]
  expect(typeof trailing === 'object' ? trailing?.sel : undefined).toBe('svg')
})
