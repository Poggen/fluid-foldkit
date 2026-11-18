// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Schema } from 'effect'
import { Block } from 'foldkit'
import { Server } from 'foldkit/experimental'
import { defineMessageUnion } from 'foldkit/message'
import { childAttributes, inertHtml as h } from 'foldkit/html'
import {
  SidebarMenuAction,
  SidebarMenuActions,
  SidebarGroupAction,
  SidebarMenuSubItem,
} from '../src/sidebar-parts.js'

const SidebarSemanticsKey = Symbol('SidebarSemantics')

it('a composed action preserves the native control semantics and the tooltip relation on one button', () => {
  const action = SidebarMenuAction(
    {
      label: 'Branch thread',
      attributes: [h.Id('branch-action')],
      children: [h.span([], ['Branch'])],
      render: (attributes, children) =>
        h.button([...attributes, h.AriaDescribedBy('branch-tooltip')], children),
    },
    h,
  )

  expect(action?.sel).toBe('button')
  expect(action?.data?.props).toMatchObject({ id: 'branch-action', type: 'button' })
  expect(action?.data?.attrs).toMatchObject({
    'aria-label': 'Branch thread',
    'aria-describedby': 'branch-tooltip',
    'data-sidebar': 'menu-action',
  })
  expect(action?.children).toMatchObject([{ sel: 'span', children: [{ text: 'Branch' }] }])
})

it('group actions expose the category used by the group popup disclosure selector', () => {
  const action = SidebarGroupAction(
    { label: 'Group options', children: [], attributes: [h.AriaExpanded(true)] },
    h,
  )
  expect(action?.sel).toBe('button')
  expect(action?.data?.attrs).toMatchObject({
    'data-sidebar': 'group-action',
    'aria-expanded': 'true',
  })
})

it('an action cluster supplies clustered placement to controls from a standalone row context', () => {
  const cluster = SidebarMenuActions(
    {
      actionContext: {
        kind: 'menu',
        placement: 'standalone',
        subRow: true,
        active: false,
        hasBadge: true,
        shape: 'rounded',
        size: 'compact',
        visibility: 'hover',
      },
      actions: (context) => {
        expect(context.placement).toBe('cluster')
        expect(context.shape).toBe('rounded')
        expect(context.size).toBe('compact')
        expect(context.subRow).toBe(true)
        expect(context.hasBadge).toBe(true)
        expect(context.visibility).toBeUndefined()
        return { entries: [h.button([h.Type('button')], ['Nested'])] }
      },
    },
    h,
  )
  expect(cluster?.children).toMatchObject([{ sel: 'button', children: [{ text: 'Nested' }] }])
})

it.effect('submenu items preserve native list semantics and forwarded hover registration', () =>
  Effect.gen(function* () {
    const Document = Block.make('SidebarSemantics', {
      key: SidebarSemanticsKey,
      InitArgs: Schema.Tuple([]),
      Model: Schema.Struct({}),
      Message: defineMessageUnion({ Noop: {} }),
      view: { kind: 'Document' },
    })
    const Composition = Document.makeComposition({ bindings: [] })
    const layer = Document.makeLayer({
      init: Composition.makeInit(() => ({ model: {} })),
      update: Composition.makeUpdate({ Noop: Document.makeNoopStep() }),
      view: Composition.makeView((_model, html) => ({
        title: 'Sidebar semantics',
        body: html.ul(
          [],
          [
            SidebarMenuSubItem(
              {
                children: ['Child'],
                attributes: childAttributes([html.DataAttribute('hover-index', '2')]),
              },
              html,
            ),
          ],
        ),
      })),
    })
    const result = yield* Server.renderToString(
      { block: Document, layer },
      {},
      { isHydratable: false },
    )
    const container = document.createElement('div')
    container.innerHTML = result.html
    const item = container.querySelector('ul > li')
    expect(item?.textContent).toBe('Child')
    expect(item?.getAttribute('data-sidebar')).toBe('menu-sub-item')
    expect(item?.getAttribute('data-hover-index')).toBe('2')
  }),
)
