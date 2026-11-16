// Adapted from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import {
  Reveal,
  RevealSkeleton,
  revealPresets,
  type RevealPresetName,
} from '@foldkit-visuals/fluid/reveal'
import { ScrollAreaBlock, layer as ScrollLayer } from '@foldkit-visuals/fluid/scroll-area'
import { TabsBlock, TabsItem, layer as TabsLayer, hoverModeOf } from '@foldkit-visuals/fluid/tabs'
import { Button } from '@foldkit-visuals/fluid/button'
import { ComponentPresentation, presentation } from '../settings'
import { target } from '../motion'
import { copy, example, page, section, type PageInputs } from './view'
const Mode = Schema.Literals(['landing', 'product'])
const key = Symbol('RevealSystemPage')
const RevealSystemPageBlock = Block.make('RevealSystemPage', {
  key,
  InitArgs: Schema.Tuple([ComponentPresentation]),
  Model: Schema.Struct({
    scrolls: Schema.Record(Schema.String, ScrollAreaBlock.Model),
    tabs: Schema.Record(Schema.String, TabsBlock.Model),
    revisions: Schema.Record(Mode, Schema.Natural),
    loaded: Schema.Boolean,
  }),
  Message: defineMessageUnion({ Replayed: { mode: Mode }, ToggledContent: {} }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  view: { kind: 'Element', Inputs: Block.makeInputContract<PageInputs>() },
})
export { RevealSystemPageBlock as RevealPageBlock }
const Scrolls = RevealSystemPageBlock.makeRecordBinding(ScrollAreaBlock, {
  field: 'scrolls',
}).withOutMessagePolicy({
  fold: () =>
    RevealSystemPageBlock.makeOutMessageFold(ScrollAreaBlock, {
      Scrolled: RevealSystemPageBlock.makeNoopStep,
    }),
})
const RawTabs = RevealSystemPageBlock.makeRecordBinding(TabsBlock, { field: 'tabs' })
const Tabs = RawTabs.withOutMessagePolicy({
  fold: (key) =>
    RevealSystemPageBlock.makeOutMessageFold(TabsBlock, {
      Selected: ({ index }) => RawTabs.requestSelected(key, { selectedIndex: index }),
    }),
})
const RevealSystemPageComposition = RevealSystemPageBlock.makeComposition({
  bindings: [Scrolls, Tabs],
})
const modes = ['landing', 'product'] as const
const presetFor = (mode: typeof Mode.Type, subtle: boolean): RevealPresetName =>
  mode === 'landing'
    ? subtle
      ? 'reveal-landing-subtle'
      : 'reveal-landing'
    : subtle
      ? 'reveal-product-subtle'
      : 'reveal-product'
export const layer = RevealSystemPageBlock.makeLayer({
  init: RevealSystemPageComposition.makeInit((settings) => ({
    model: { scrolls: {}, tabs: {}, revisions: { landing: 0, product: 0 }, loaded: false },
    steps: modes.flatMap((key) => [
      RevealSystemPageBlock.makeStep((model) =>
        initAndInsert(Scrolls, model, { key, args: [{ id: `system-reveal-scroll-${key}` }] }),
      ),
      RevealSystemPageBlock.makeStep((model) =>
        initAndInsert(Tabs, model, {
          key,
          args: [{ id: `system-reveal-tabs-${key}`, selectedIndex: 0, hoverMode: settings.hover }],
        }),
      ),
    ]),
  })),
  update: RevealSystemPageComposition.makeUpdate({
    Replayed: RevealSystemPageBlock.makeStep((model, { mode }) =>
      Update.combineSteps([
        RevealSystemPageBlock.makeFieldsStep(() => ({
          revisions: (values) => ({ ...values, [mode]: values[mode] + 1 }),
        })),
        Scrolls.requestScroll(mode, { top: 0, left: 0 }),
      ]),
    ),
    ToggledContent: RevealSystemPageBlock.makeFieldsStep(() => ({ loaded: (value) => !value })),
  }),
  inMessageUpdate: RevealSystemPageComposition.makeInMessageUpdate({
    InformedOfPresentation: RevealSystemPageBlock.makeStep((model, { presentation }) =>
      Update.combineSteps(
        Object.entries(model.tabs).flatMap(([key, child]) =>
          hoverModeOf(child) === presentation.hover
            ? []
            : [Tabs.requestHoverMode(key, { mode: presentation.hover })],
        ),
      ),
    ),
  }),
  view: RevealSystemPageComposition.makeView.withInputs((model, { settings }, h) => {
    const context = presentation(settings)
    const demo = (mode: typeof Mode.Type) => {
      const scroll = model.scrolls[mode],
        tabs = model.tabs[mode]
      if (scroll === undefined || tabs === undefined) return h.empty
      const preset = presetFor(mode, tabs.selectedIndex === 1),
        spec = revealPresets[preset]
      const card = (title: string, text: string) =>
        h.article(
          [h.Class('flex flex-col gap-1.5')],
          [
            h.h3([h.Class('text-site-title text-foreground leading-none')], [title]),
            h.p([], [text]),
          ],
        )
      const landing = [
        h.header(
          [],
          [
            h.h2(
              [h.Class('text-site-title text-foreground leading-none')],
              ['Your team. One inbox.'],
            ),
            h.p([], ['Support, sales, and billing in one list, sorted by who owes a reply.']),
            Button({ context, children: ['Open Tidepool'] }, h),
          ],
        ),
        h.section(
          [],
          [
            h.h2(
              [h.Class('text-site-title text-foreground leading-none')],
              ['A calmer place to work'],
            ),
            h.div(
              [h.Class('grid gap-8 sm:grid-cols-3')],
              [
                card('1 inbox', 'Support, sales, and billing in one list.'),
                card(
                  'Claim, then type',
                  'A name on the thread before the draft. Nobody answers twice.',
                ),
                card(
                  'Quiet nudges',
                  'A thread waiting 4 hours pings its owner once. Only its owner.',
                ),
              ],
            ),
          ],
        ),
        h.section(
          [],
          [
            h.h2(
              [h.Class('text-site-title text-foreground leading-none')],
              ['Set up your shared inbox'],
            ),
            ...['Forward your address', 'Invite the team', 'Set your nudges'].map((label) =>
              Reveal(
                {
                  scroll: true,
                  children: [card(label, 'Everyone sees the same inbox and who owns what.')],
                },
                h,
              ),
            ),
          ],
        ),
      ]
      const product = [
        h.header(
          [],
          [
            h.h2([h.Class('text-site-title text-foreground leading-none')], ['Tidepool']),
            h.p([], ['Inbox · Assigned to me · Snoozed · Done']),
          ],
        ),
        h.section(
          [],
          [
            h.h3([h.Class('text-site-title text-foreground leading-none')], ['Your inbox']),
            Reveal(
              {
                swap: true,
                items: true,
                children: model.loaded
                  ? [
                      'Invoice 2041 is missing the VAT line',
                      'Can we move the onboarding call?',
                      'Card ending 4242 expires in May',
                      'Love the new export, one question',
                      'SSO for the second workspace?',
                    ].map((subject) => card(subject, 'Ready to reply'))
                  : [1, 2, 3, 4, 5].map(() =>
                      RevealSkeleton(
                        {
                          className:
                            '[.system-docs_&]:h-[5rem] [.system-docs_&]:my-3 [.system-docs_&]:rounded-[var(--system-frame-radius,_0.75rem)] ',
                        },
                        h,
                      ),
                    ),
              },
              h,
            ),
          ],
        ),
      ]
      return example(
        h,
        `${mode} reveal`,
        [
          h.div(
            [
              h.Class(
                '[.system-docs_&]:flex [.system-docs_&]:flex-wrap [.system-docs_&]:items-center [.system-docs_&]:gap-3 [.system-docs_&]:my-4 ',
              ),
            ],
            [
              h.block(
                Tabs.embedView({
                  key: mode,
                  slotId: tabs.id,
                  model: tabs,
                  viewInputs: {
                    context,
                    animate: target.node,
                    items: [{ value: 'Default' }, { value: 'Subtle' }],
                    content: (tabsContext) =>
                      ['Default', 'Subtle'].map((label, index) =>
                        TabsItem({ index, label }, tabsContext, h),
                      ),
                  },
                }),
              ),
              Button(
                {
                  context,
                  variant: 'secondary',
                  children: ['Replay'],
                  attributes: [h.OnClick(RevealSystemPageBlock.Message.Replayed({ mode }))],
                },
                h,
              ),
            ],
          ),
          h.block(
            Scrolls.embedView({
              key: mode,
              slotId: scroll.id,
              model: scroll,
              viewInputs: {
                context,
                children: [],
                className: `w-full overflow-y-auto bg-background outline-none ${mode === 'landing' ? 'h-[560px]' : 'h-[500px]'}`,
                content: () => [
                  h.keyed('div')(
                    `${mode}-${model.revisions[mode]}-${preset}`,
                    [],
                    [Reveal({ preset, children: mode === 'landing' ? landing : product }, h)],
                  ),
                ],
              },
            }),
          ),
          h.p([], [`${preset} · ${spec.spring} spring · ${spec.step}s step`]),
          ...(mode === 'product'
            ? [
                Button(
                  {
                    context,
                    variant: 'secondary',
                    children: [model.loaded ? 'Show slow data' : 'Load data'],
                    attributes: [h.OnClick(RevealSystemPageBlock.Message.ToggledContent())],
                  },
                  h,
                ),
              ]
            : []),
        ],
        settings,
      )
    }
    return page(h, 'reveal', settings, [
      section(h, 'Landing', [...copy(h, 'reveal', 'Landing'), demo('landing')]),
      section(h, 'Product', [...copy(h, 'reveal', 'Product'), demo('product')]),
      section(h, 'Set it up', [
        h.ul(
          [],
          [
            'Put everything on screen at first paint in the hero, product shot included.',
            'Keep the header, sidebar, and footer outside the container.',
            'In a grid, add reveal-scroll to each card, and again inside it so its content follows.',
            'Clip with overflow: clip around anything that reveals on scroll.',
          ].map((text) => h.li([], [text])),
        ),
      ]),
      section(h, 'Built in', [
        h.ul(
          [],
          [
            'Just CSS: nothing to load, nothing to hydrate. Landing steps use the slow spring, product steps the moderate spring, and scroll steps follow the scroll.',
            'Cards already on screen at load play right after the hero.',
            'Browsers without scroll timelines show every section in place.',
            'Reduced motion keeps fades and stops rise, scale, scroll motion, and pulse.',
          ].map((text) => h.li([], [text])),
        ),
      ]),
      section(h, 'Reference', [
        h.table(
          [
            h.Class(
              'w-full border-collapse text-site-body tabular-nums [&_th:first-child]:pl-0 [&_td:first-child]:pl-0',
            ),
          ],
          [
            h.thead(
              [],
              [
                h.tr(
                  [],
                  ['Preset', 'Spring', 'Step', 'Rise', 'Scale'].map((v) =>
                    h.th([h.Class('px-3 py-2 text-left text-foreground')], [v]),
                  ),
                ),
              ],
            ),
            h.tbody(
              [],
              Object.entries(revealPresets).map(([name, spec]) =>
                h.tr(
                  [],
                  [
                    name,
                    spec.spring,
                    String(spec.step),
                    'distance' in spec ? String(spec.distance) : 'none',
                    'scale' in spec ? String(spec.scale) : 'none',
                  ].map((v) => h.td([h.Class('px-3 py-2 text-muted-foreground')], [v])),
                ),
              ),
            ),
          ],
        ),
      ]),
    ])
  }),
}).pipe(Layer.provide(Layer.merge(ScrollLayer, TabsLayer)))
