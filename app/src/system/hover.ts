// Adapted from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { HoverBlock, layer as HoverLayer } from '@foldkit-visuals/fluid/hover'
import {
  HoverHighlightBlock,
  layer as HighlightLayer,
  hoverHighlightAnimation,
} from '@foldkit-visuals/fluid/hover-highlight'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import { Button } from '@foldkit-visuals/fluid/button'
import { ComponentPresentation } from '../settings'
import { target } from '../motion'
import { copy, example, page, section, type PageInputs } from './view'

const key = Symbol('HoverSystemPage')
const HoverSystemPageBlock = Block.make('HoverSystemPage', {
  key,
  InitArgs: Schema.Tuple([ComponentPresentation]),
  Model: Schema.Struct({
    hovers: Schema.Record(Schema.String, HoverBlock.Model),
    highlights: Schema.Record(Schema.String, HoverHighlightBlock.Model),
    nearest: Schema.Boolean,
    axis: Schema.Literals(['x', 'y', 'xy']),
    picked: Schema.Record(Schema.String, Schema.Int),
    nested: Schema.Boolean,
  }),
  Message: defineMessageUnion({
    ToggledNearest: {},
    SelectedAxis: { axis: Schema.Literals(['x', 'y', 'xy']) },
    PickedRow: { group: Schema.String, index: Schema.Int },
    ToggledNested: {},
  }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  view: { kind: 'Element', Inputs: Block.makeInputContract<PageInputs>() },
})
export { HoverSystemPageBlock as HoverPageBlock }
const Highlights = HoverSystemPageBlock.makeRecordBinding(HoverHighlightBlock, {
  field: 'highlights',
})
const Hovers = HoverSystemPageBlock.makeRecordBinding(HoverBlock, {
  field: 'hovers',
}).withOutMessagePolicy({
  fold: (key) =>
    HoverSystemPageBlock.makeOutMessageFold(HoverBlock, {
      Changed: (snapshot) =>
        Highlights.informOfSource(key, { snapshot, hidden: false, mode: 'fluid' }),
    }),
})
const HoverSystemPageComposition = HoverSystemPageBlock.makeComposition({
  bindings: [Hovers, Highlights],
})
const ids = ['comparison', 'math', 'axes', 'split-a', 'split-b', 'cost']
const config = (axis: 'x' | 'y' | 'xy', nearest: boolean) => ({
  mode: 'fluid' as const,
  axis,
  nearest,
  gapClick: true,
  maxDistance: Infinity,
})
export const layer = HoverSystemPageBlock.makeLayer({
  init: HoverSystemPageComposition.makeInit(() => ({
    model: { hovers: {}, highlights: {}, nearest: true, axis: 'xy', picked: {}, nested: true },
    steps: ids.flatMap((key) => [
      HoverSystemPageBlock.makeStep((model) =>
        initAndInsert(Hovers, model, {
          key,
          args: [
            {
              id: `system-hover-${key}`,
              ...config(key === 'axes' ? 'xy' : 'y', key === 'math' || key === 'axes'),
            },
          ],
        }),
      ),
      HoverSystemPageBlock.makeStep((model) =>
        initAndInsert(Highlights, model, {
          key,
          args: [{ id: `system-highlight-${key}`, mode: 'fluid' }],
        }),
      ),
    ]),
  })),
  update: HoverSystemPageComposition.makeUpdate({
    ToggledNearest: HoverSystemPageBlock.makeStep((model) =>
      Update.combineSteps([
        HoverSystemPageBlock.makeFieldsStep(() => ({ nearest: (value) => !value })),
        Hovers.requestConfigure('math', { options: config('y', !model.nearest) }),
      ]),
    ),
    SelectedAxis: HoverSystemPageBlock.makeStep.fromMessage(({ axis }) =>
      Update.combineSteps([
        HoverSystemPageBlock.makeFieldsStep(() => ({ axis: () => axis })),
        Hovers.requestConfigure('axes', { options: config(axis, true) }),
      ]),
    ),
    PickedRow: HoverSystemPageBlock.makeFieldsStep.fromMessage(({ group, index }) => ({
      picked: (values) => ({ ...values, [group]: index }),
    })),
    ToggledNested: HoverSystemPageBlock.makeFieldsStep(() => ({ nested: (value) => !value })),
  }),
  inMessageUpdate: HoverSystemPageComposition.makeInMessageUpdate({
    InformedOfPresentation: HoverSystemPageBlock.makeNoopStep(),
  }),
  view: HoverSystemPageComposition.makeView.withInputs((model, { settings }, h) => {
    const context = createPresentationContext({
      shape: settings.shape,
      size: settings.size,
      hoverMode: 'fluid',
      reducedMotion: 'user',
    })
    const button = (label: string, message: typeof HoverSystemPageBlock.Message.Type) =>
      Button(
        { context, variant: 'secondary', children: [label], attributes: [h.OnClick(message)] },
        h,
      )
    const list = (key: string, labels: ReadonlyArray<string>, layout = '') => {
      const hover = model.hovers[key],
        highlight = model.highlights[key]
      if (hover === undefined || highlight === undefined) return h.empty
      return h.block(
        Hovers.embedView({
          key,
          slotId: hover.id,
          model: hover,
          viewInputs: {
            className: `relative flex w-full flex-col gap-1 p-2 system-hover-list ${layout}`,
            content: ({ itemAttributes }) => [
              h.block(
                Highlights.embedView({
                  key,
                  slotId: highlight.id,
                  model: highlight,
                  viewInputs: {
                    className: 'rounded-lg',
                    animate: hoverHighlightAnimation(target),
                  },
                }),
              ),
              ...labels.map((label, index) =>
                h.button(
                  [
                    ...itemAttributes(index, false),
                    h.Class(
                      'relative z-10 flex h-9 w-full items-center px-3 text-left outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]' +
                        (label.startsWith(' ') ? ' ps-8!' : ''),
                    ),
                    h.AriaPressed(String(model.picked[key] === index)),
                    h.OnClick(HoverSystemPageBlock.Message.PickedRow({ group: key, index })),
                  ],
                  [label],
                ),
              ),
            ],
          },
        }),
      )
    }
    const labels = ['Inbox', 'Drafts', 'Sent', 'Archive', 'Trash']
    return page(h, 'fluid-hover', settings, [
      section(h, 'Blink or glide', [
        ...copy(h, 'fluid-hover', 'Blink or glide'),
        example(
          h,
          'Compare plain and fluid hover',
          [
            h.div(
              [h.Class('grid w-full gap-5 sm:grid-cols-2 ')],
              [
                h.div(
                  [],
                  [
                    h.h3(
                      [h.Class('text-site-title text-foreground leading-none')],
                      ['Plain hover'],
                    ),
                    ...labels.map((label) =>
                      h.button(
                        [
                          h.Class(
                            'relative z-10 flex h-9 w-full shrink-0 items-center px-3 text-left text-site-body text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)] hover:bg-hover',
                          ),
                        ],
                        [label],
                      ),
                    ),
                  ],
                ),
                h.div(
                  [],
                  [
                    h.h3(
                      [h.Class('text-site-title text-foreground leading-none')],
                      ['Fluid hover'],
                    ),
                    list('comparison', labels),
                  ],
                ),
              ],
            ),
            h.p(
              [],
              [
                'Move your pointer through both lists. These examples keep fluid hover enabled so the comparison remains available.',
              ],
            ),
          ],
          settings,
        ),
      ]),
      section(h, 'Show the math', [
        ...copy(h, 'fluid-hover', 'Show the math'),
        button(
          model.nearest ? 'Nearest is on' : 'Nearest is off',
          HoverSystemPageBlock.Message.ToggledNearest(),
        ),
        list('math', labels, ' [.system-docs_&]:gap-6'),
        h.output(
          [
            h.Class(
              '[.system-docs_&]:block [.system-docs_&]:my-4 [.system-docs_&]:text-muted-foreground [.system-docs_&]:tabular-nums',
            ),
          ],
          [`Active row: ${model.hovers.math?.activeIndex ?? 'none'}`],
        ),
      ]),
      section(h, '3 axes', [
        ...copy(h, 'fluid-hover', '3 axes'),
        h.div(
          [
            h.Class(
              '[.system-docs_&]:flex [.system-docs_&]:flex-wrap [.system-docs_&]:items-center [.system-docs_&]:gap-3 [.system-docs_&]:my-4 ',
            ),
          ],
          (['x', 'y', 'xy'] as const).map((axis) =>
            button(axis, HoverSystemPageBlock.Message.SelectedAxis({ axis })),
          ),
        ),
        list(
          'axes',
          ['Search', 'Mail', 'Calendar', 'Files', 'People', 'Settings'],
          model.axis === 'x'
            ? 'system-horizontal [.system-docs_&]:flex-row [.system-docs_&]:overflow-x-auto'
            : model.axis === 'xy'
              ? '[.system-docs_.system-hover-list&]:grid [.system-docs_&]:grid-cols-3 [@media(max-width:48rem)]:[.system-docs_&]:grid-cols-[1fr]'
              : '',
        ),
      ]),
      section(h, 'When to split a list', [
        ...copy(h, 'fluid-hover', 'When to split a list'),
        button(
          model.nested ? 'Collapse team' : 'Expand team',
          HoverSystemPageBlock.Message.ToggledNested(),
        ),
        h.div(
          [h.Class('grid w-full gap-5 sm:grid-cols-2 ')],
          [
            list(
              'split-a',
              model.nested
                ? ['Today', 'This week', 'Team', ' Design', ' Engineering']
                : ['Today', 'This week', 'Team'],
            ),
            list('split-b', ['Settings', 'Help', 'Sign out']),
          ],
        ),
      ]),
      section(h, 'What it costs', [
        ...copy(h, 'fluid-hover', 'What it costs'),
        h.p(
          [],
          [
            'The row count comes from the native hover snapshot after measurement. It is not a performance counter.',
          ],
        ),
        h.div(
          [h.Class('relative flex max-h-64 w-full flex-col overflow-y-auto p-2')],
          [
            list(
              'cost',
              Array.from({ length: 200 }, (_, i) => `Row ${i + 1}`),
            ),
          ],
        ),
        h.output(
          [
            h.Class(
              '[.system-docs_&]:block [.system-docs_&]:my-4 [.system-docs_&]:text-muted-foreground [.system-docs_&]:tabular-nums',
            ),
          ],
          [
            `Measured rows: ${model.hovers.cost?.itemRects.length ?? 0}. Active row: ${model.hovers.cost?.activeIndex ?? 'none'}.`,
          ],
        ),
      ]),
      section(h, 'Use when', [
        h.ul(
          [],
          ['Every item can be clicked.', 'Items are close together and stay in place.'].map(
            (text) => h.li([], [text]),
          ),
        ),
      ]),
      section(h, 'Skip when', [
        h.ul(
          [],
          [
            'A wrong click would hurt.',
            'Only some cards can be clicked.',
            'Items have large gaps or move while scrolling.',
          ].map((text) => h.li([], [text])),
        ),
      ]),
      section(h, 'Reduced motion', [...copy(h, 'fluid-hover', 'Reduced motion')]),
      section(h, 'Reference', [
        h.p(
          [],
          [
            'HoverBlock owns pointer observation and hit testing. HoverHighlightBlock draws its snapshot. Rows keep their own focus, semantics, and click handlers. Native options include axis, nearest, gapClick, maxDistance, and mode.',
          ],
        ),
      ]),
    ])
  }),
}).pipe(Layer.provide(Layer.merge(HoverLayer, HighlightLayer)))
