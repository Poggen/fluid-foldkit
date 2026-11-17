import { expect } from 'vitest'
import { it } from '@effect/vitest'
import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import type { Html } from 'foldkit/html'
import { renderToString } from 'foldkit/experimental/server'
import { Window } from 'happy-dom'
import { SidebarAppPanelBlock, SidebarAppPanelLayer } from '../src/sidebar-app-panel.js'

const Config = Schema.Struct({
  occurrence: Schema.Literals(['desktop', 'mobile']),
  viewportMobile: Schema.Boolean,
})
type Config = typeof Config.Type
const Model = Schema.Struct({
  panel: SidebarAppPanelBlock.Model,
  viewportMobile: Schema.Boolean,
})
type Model = typeof Model.Type
const FixtureKey = Symbol('SidebarPanelOccurrenceFixture')
const Fixture = Block.make('SidebarPanelOccurrenceFixture', {
  key: FixtureKey,
  Model,
  Message: Schema.Never,
  InitArgs: Schema.Tuple([Config]),
  effects: Block.makeEffectsContract<
    never,
    Block.FactsOf<typeof SidebarAppPanelBlock>['programRequirements']
  >(),
  view: { kind: 'Document' },
})
const Panel = Fixture.makeRequiredFieldBinding(SidebarAppPanelBlock, {
  field: 'panel',
  init: {
    contextToArgs: (config: Config) => [{ id: 'physical-panel', occurrence: config.occurrence }],
  },
}).withOutMessagePolicy({
  fold: Fixture.makeOutMessageFold(SidebarAppPanelBlock, {
    Selected: Fixture.makeNoopStep,
  }),
})
const Composition = Fixture.makeComposition({ bindings: [Panel] })
const preserveNode = (node: Html) => node
const layer = Fixture.makeLayer({
  init: Composition.makeInit((config: Config) => ({
    childInitContext: config,
    model: { viewportMobile: config.viewportMobile },
  })),
  update: Composition.makeUpdate({}),
  view: Composition.makeView((model, h) => ({
    title: 'Physical Sidebar content',
    body: h.block(
      Panel.embedView({
        slotId: 'panel',
        model: model.panel,
        viewInputs: {
          animate: preserveNode,
          highlight: preserveNode,
          sidebar: {
            open: true,
            mobile: model.viewportMobile,
            peeking: false,
            side: 'left',
            ownerId: 'physical-sidebar',
            shortcut: null,
            shortcutKey: '[',
            trigger: [],
          },
        },
      }),
    ),
  })),
}).pipe(Layer.provide(SidebarAppPanelLayer))

for (const occurrence of ['desktop', 'mobile'] as const) {
  for (const viewportMobile of [false, true]) {
    it.effect(
      `${occurrence} content keeps its scroll structure when viewport mobile is ${viewportMobile}`,
      () =>
        Effect.gen(function* () {
          const rendered = yield* renderToString(
            { block: Fixture, layer },
            { Flags: Config },
            { flags: { occurrence, viewportMobile }, isHydratable: false },
          )
          const window = new Window()
          try {
            window.document.body.innerHTML = rendered.html
            const content = window.document.querySelector('[data-sidebar="content"]')
            expect(content).not.toBeNull()
            expect(content?.classList.contains('overflow-y-auto')).toBe(occurrence === 'mobile')
            const viewport = window.document.querySelector('[data-slot="scroll-area-viewport"]')
            expect(viewport !== null).toBe(occurrence === 'desktop')
            expect(
              occurrence === 'mobile' || (content !== null && viewport?.contains(content)),
            ).toBe(true)
            const disclosure = window.document.getElementById(
              'physical-panel-platform-group-button',
            )
            expect(disclosure?.getAttribute('aria-controls')).toBe(
              'physical-panel-platform-group-panel',
            )
            expect(
              window.document.getElementById('physical-panel-platform-group-panel'),
            ).not.toBeNull()
            expect(window.document.querySelectorAll('[data-sidebar="header"]')).toHaveLength(1)
            expect(window.document.querySelectorAll('[data-sidebar="footer"]')).toHaveLength(1)
            for (const label of ['User', 'Workspace']) {
              const menu = window.document.querySelector(
                `ul[data-sidebar="menu"][aria-label="${label}"]`,
              )
              if (menu === null) throw new Error(`Missing ${label} menu`)
              expect(
                [...menu.children]
                  .filter((child) => !['LI', 'SCRIPT', 'TEMPLATE'].includes(child.tagName))
                  .map((child) => child.tagName),
              ).toEqual([])
            }
          } finally {
            window.close()
          }
        }),
    )
  }
}
