import { Effect, Layer, Schema, Schedule } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { Html } from 'foldkit/html'
import { NavMenuBlock, navMenuLayer, NavItemConfig } from '../src/nav-menu.js'
import { SidebarMenuSub } from '../src/sidebar-parts.js'
import { HOVER_HIDDEN_ATTR } from '../src/hover-attributes.js'

const items = [
  { value: 'parent', label: 'Parent', level: 0, active: false },
  { value: 'child', label: 'Child', level: 1, active: true },
  { value: 'deep', label: 'Deep', level: 2, active: false },
  { value: 'peer', label: 'Peer', level: 0, active: false },
  { value: 'peer-child', label: 'Peer child', level: 1, active: true },
  { value: 'tail', label: 'Tail', level: 0, active: false },
].map((item) =>
  NavItemConfig.make({
    value: item.value,
    label: item.label,
    href: `#${item.value}`,
    level: item.level,
    status: item.active ? 'active' : null,
    disabled: false,
    badge: null,
  }),
)

const Model = Schema.Struct({
  menu: NavMenuBlock.Model,
  sibling: NavMenuBlock.Model,
  open: Schema.Boolean,
  deep: Schema.Boolean,
  swap: Schema.Boolean,
  retired: Schema.Boolean,
  visible: Schema.Boolean,
  accepts: Schema.Boolean,
})

const Json = Schema.fromJsonString(Schema.toCodecJson(Model))

const Message = defineMessageUnion({
  Measure: {},
  Toggle: {},
  Deep: {},
  Swap: {},
  Retire: {},
  Visible: {},
  Accepts: {},
})

const Key = Symbol('AuthoredNavProgram')

const effects = Block.makeEffectsContract()

const Root = Block.make('AuthoredNavProgram', {
  key: Key,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  effects,
  view: { kind: 'Element' },
})

const MenuRequests = Root.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'menu',
  init: { contextToArgs: () => [{ id: 'authored-nav', items }] },
})

const Menu = MenuRequests.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(NavMenuBlock, {
    Selected: ({ value, href }) =>
      Root.makeStep((model) => {
        if (value === 'parent') {
          return { model: model.accepts ? { ...model, open: !model.open } : model }
        }

        return MenuRequests.requestConfigure({ items, activeSlug: href })
      }),
  }),
})

const SiblingRequests = Root.makeRequiredFieldBinding(NavMenuBlock, {
  field: 'sibling',
  init: { contextToArgs: () => [{ id: 'sibling-nav', items: items.slice(0, 2) }] },
})

const Sibling = SiblingRequests.withOutMessagePolicy({
  fold: Root.makeOutMessageFold(NavMenuBlock, {
    Selected: Root.makeNoopStep,
  }),
})

const composition = Root.makeComposition({ bindings: [Menu, Sibling] })

const preserve = (node: Html) => node

const layer = Root.makeLayer({
  init: composition.makeInit(() => ({
    model: { open: true, deep: true, swap: false, retired: false, visible: true, accepts: true },
  })),
  update: composition.makeUpdate({
    Measure: Root.makeStep(() => MenuRequests.requestConfigure({ items, activeSlug: null })),
    Toggle: Root.makeFieldsStep(() => ({ open: (value) => !value })),
    Deep: Root.makeFieldsStep(() => ({ deep: (value) => !value })),
    Swap: Root.makeFieldsStep(() => ({ swap: (value) => !value })),
    Retire: Root.makeFieldsStep(() => ({ retired: (value) => !value })),
    Visible: Root.makeFieldsStep(() => ({ visible: (value) => !value })),
    Accepts: Root.makeFieldsStep(() => ({ accepts: (value) => !value })),
  }),
  view: composition.makeView((model, h) =>
    h.div(
      [],
      [
        h.pre([h.Id('authored-state')], [Schema.encodeSync(Json)(model)]),
        h.button([h.Id('measure'), h.OnClick(Message.Measure())], ['Measure']),
        h.button([h.Id('toggle'), h.OnClick(Message.Toggle())], ['Toggle']),
        h.button([h.Id('deep'), h.OnClick(Message.Deep())], ['Deep toggle']),
        h.button([h.Id('swap'), h.OnClick(Message.Swap())], ['Swap']),
        h.button([h.Id('retire'), h.OnClick(Message.Retire())], ['Retire']),
        h.button([h.Id('visible'), h.OnClick(Message.Visible())], ['Visible']),
        h.button([h.Id('accepts'), h.OnClick(Message.Accepts())], ['Accepts']),
        model.visible
          ? h.block(
              Menu.embedView({
                slotId: 'menu',
                model: model.menu,
                viewInputs: {
                  sidebar: true,
                  animate: (node, options) =>
                    h.div(
                      [
                        h.Style({ display: 'contents' }),
                        h.DataAttribute('nav-target-top', String(options.animate.top)),
                        h.DataAttribute('nav-transition', JSON.stringify(options.transition) ?? ''),
                      ],
                      [node],
                    ),
                  highlight: (node, present, rect, _reduceMotion, transition) =>
                    h.div(
                      [
                        h.Style({ display: 'contents' }),
                        h.DataAttribute('hover-present', String(present)),
                        h.DataAttribute('hover-target-top', String(rect.top)),
                        h.DataAttribute(
                          'hover-transition',
                          transition === false ? 'snap' : 'spring',
                        ),
                      ],
                      [node],
                    ),
                  kind: (item) => (item.value === 'parent' ? 'action' : 'link'),
                  rowActions: (item) => ({
                    entries:
                      item.value === 'parent'
                        ? [h.button([h.Type('button'), h.Id('parent-action')], ['Action'])]
                        : [],
                  }),
                  rowDisclosure: (item) =>
                    item.value === 'parent'
                      ? { expanded: model.open, controls: 'authored-sub' }
                      : undefined,
                  content: ({ row }) => {
                    const parent = row('parent', {
                      children: [
                        SidebarMenuSub(
                          {
                            open: model.open,
                            attributes: [h.Id('authored-sub')],
                            animate: preserve,
                            children: [
                              row('child', {
                                children: [
                                  SidebarMenuSub(
                                    {
                                      open: model.deep,
                                      animate: preserve,
                                      attributes: [h.Id('authored-deep')],
                                      children: model.retired ? [] : [row('deep')],
                                    },
                                    h,
                                  ),
                                ],
                              }),
                            ],
                          },
                          h,
                        ),
                      ],
                    })

                    const peer = row('peer', {
                      children: [
                        SidebarMenuSub(
                          {
                            open: true,
                            attributes: [h.Id('authored-peer')],
                            animate: preserve,
                            children: [row('peer-child')],
                          },
                          h,
                        ),
                      ],
                    })

                    return model.swap ? [row('tail'), peer, parent] : [parent, peer, row('tail')]
                  },
                },
              }),
            )
          : h.empty,
        h.block(
          Sibling.embedView({
            slotId: 'sibling',
            model: model.sibling,
            viewInputs: { animate: preserve, highlight: preserve },
          }),
        ),
      ],
    ),
  ),
}).pipe(Layer.provide(navMenuLayer))

export const eventually = (assertion: () => void) =>
  Effect.try(assertion).pipe(Effect.retry({ times: 100, schedule: Schedule.spaced('10 millis') }))

export const acquireAuthoredNav = Effect.gen(function* acquireAuthoredNav() {
  const host = document.createElement('div')
  const container = document.createElement('div')
  container.id = 'authored-test'
  host.append(container)
  document.body.append(host)
  const app = Runtime.embed(Program.makeElement({ block: Root, layer, container }))
  yield* Effect.addFinalizer(() =>
    Effect.promise(app.dispose).pipe(
      Effect.andThen(
        Effect.sync(() => {
          host.remove()
        }),
      ),
    ),
  )

  const element = (selector: string) => {
    const result = host.querySelector<HTMLElement>(selector)

    if (result === null) {
      throw new Error(`Missing ${selector}`)
    }

    return result
  }

  const snapshot = () => Schema.decodeSync(Json)(element('#authored-state').textContent ?? '')
  yield* eventually(() => {
    snapshot()
  })

  const row = (value: string, sibling = false) => {
    const index = items.findIndex((item) => item.value === value)

    return element(
      `${sibling ? '#sibling-nav-hover' : '#authored-nav-hover'} [data-nav-index="${index}"]`,
    )
  }

  const installLayout = () => {
    for (const id of ['authored-nav-hover', 'sibling-nav-hover']) {
      const root = element(`#${id}`)
      Object.defineProperties(root, {
        offsetWidth: { configurable: true, value: 240 },
        offsetHeight: { configurable: true, value: 240 },
        getBoundingClientRect: { configurable: true, value: () => new DOMRect(0, 0, 240, 240) },
      })

      for (const button of root.querySelectorAll<HTMLElement>('[data-nav-index]')) {
        Object.defineProperties(button, {
          offsetWidth: { configurable: true, value: 200 },
          offsetHeight: { configurable: true, value: 32 },
          offsetTop: {
            configurable: true,
            get: () =>
              [...root.querySelectorAll('[data-nav-index]')]
                .filter((item) => item.closest(`[${HOVER_HIDDEN_ATTR}]`) === null)
                .indexOf(button) * 32,
          },
          offsetLeft: { configurable: true, value: 0 },
          offsetParent: { configurable: true, value: root },
          getClientRects: { configurable: true, value: () => [new DOMRect(0, 0, 200, 32)] },
        })
        const owner = button.closest('li')

        if (owner !== null) {
          Object.defineProperty(owner, 'offsetHeight', {
            configurable: true,
            value: 300,
          })
        }
      }
    }
  }

  installLayout()
  element('#measure').click()
  yield* eventually(() => {
    if (!snapshot().menu.hover.isMeasured) {
      throw new Error('Awaiting real measurement')
    }
  })

  return {
    host,
    snapshot,
    row,
    element,
    installLayout,
    makeUnavailable: (value: string) =>
      Object.defineProperties(row(value), {
        offsetWidth: { configurable: true, value: 0 },
        offsetHeight: { configurable: true, value: 0 },
        offsetParent: { configurable: true, value: null },
      }),
    click: (id: string) =>
      Effect.sync(() => {
        element(`#${id}`).click()
      }),
    move: (value: string, sibling = false) =>
      Effect.sync(() =>
        row(value, sibling).dispatchEvent(
          new MouseEvent('mousemove', { bubbles: true, clientX: 30, clientY: 30 }),
        ),
      ),
  }
})
