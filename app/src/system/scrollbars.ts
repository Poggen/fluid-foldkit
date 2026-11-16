// Adapted from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { initAndInsert } from 'foldkit/binding'
import { defineInMessageUnion } from 'foldkit/message'
import { ScrollAreaBlock, layer as ScrollLayer } from '@foldkit-visuals/fluid/scroll-area'
import { ComponentPresentation, presentation } from '../settings'
import { copy, example, page, section, snippet, type PageInputs } from './view'
const key = Symbol('ScrollbarsSystemPage')
const ScrollbarsSystemPageBlock = Block.make('ScrollbarsSystemPage', {
  key,
  InitArgs: Schema.Tuple([ComponentPresentation]),
  Model: Schema.Struct({ areas: Schema.Record(Schema.String, ScrollAreaBlock.Model) }),
  Message: Schema.Never,
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  view: { kind: 'Element', Inputs: Block.makeInputContract<PageInputs>() },
})
export { ScrollbarsSystemPageBlock as ScrollbarsPageBlock }
const Areas = ScrollbarsSystemPageBlock.makeRecordBinding(ScrollAreaBlock, {
  field: 'areas',
}).withOutMessagePolicy({
  fold: () =>
    ScrollbarsSystemPageBlock.makeOutMessageFold(ScrollAreaBlock, {
      Scrolled: ScrollbarsSystemPageBlock.makeNoopStep,
    }),
})
const ScrollbarsSystemPageComposition = ScrollbarsSystemPageBlock.makeComposition({
  bindings: [Areas],
})
const ids = ['problem', 'fade', 'horizontal', 'both'] as const
export const layer = ScrollbarsSystemPageBlock.makeLayer({
  init: ScrollbarsSystemPageComposition.makeInit(() => ({
    model: { areas: {} },
    steps: ids.map((key) =>
      ScrollbarsSystemPageBlock.makeStep((model) =>
        initAndInsert(Areas, model, {
          key,
          args: [
            {
              id: `system-scroll-${key}`,
              orientation:
                key === 'both' ? 'both' : key === 'horizontal' ? 'horizontal' : 'vertical',
            },
          ],
        }),
      ),
    ),
  })),
  update: ScrollbarsSystemPageComposition.makeUpdate({}),
  inMessageUpdate: ScrollbarsSystemPageComposition.makeInMessageUpdate({
    InformedOfPresentation: ScrollbarsSystemPageBlock.makeNoopStep(),
  }),
  view: ScrollbarsSystemPageComposition.makeView.withInputs((model, { settings }, h) => {
    const context = presentation(settings)
    const releases = () =>
      Array.from({ length: 24 }, (_, index) =>
        h.p(
          [h.Class('px-3 py-2 text-site-body text-foreground whitespace-nowrap')],
          [`v1.${23 - index}.0 — maintenance release`],
        ),
      )
    const area = (
      key: string,
      children: () => ReturnType<typeof h.div>[],
      className: string,
      fade = '',
    ) => {
      const child = model.areas[key]
      return child === undefined
        ? h.empty
        : h.block(
            Areas.embedView({
              key,
              slotId: child.id,
              model: child,
              viewInputs: {
                context,
                children: [],
                className,
                viewportClassName: fade,
                content: children,
              },
            }),
          )
    }
    const table = () =>
      h.table(
        [
          h.Class(
            [
              'w-max',
              'w-full border-collapse text-site-body tabular-nums [&_th:first-child]:pl-0 [&_td:first-child]:pl-0',
            ].join(' '),
          ),
        ],
        [
          h.thead(
            [],
            [
              h.tr(
                [],
                [
                  'City',
                  'Jan',
                  'Feb',
                  'Mar',
                  'Apr',
                  'May',
                  'Jun',
                  'Jul',
                  'Aug',
                  'Sep',
                  'Oct',
                  'Nov',
                  'Dec',
                ].map((label) => h.th([h.Class('px-3 py-2 text-left text-foreground')], [label])),
              ),
            ],
          ),
          h.tbody(
            [],
            [
              'Amsterdam',
              'Berlin',
              'Copenhagen',
              'Dublin',
              'Edinburgh',
              'Florence',
              'Geneva',
              'Helsinki',
              'Istanbul',
              'Lisbon',
              'Madrid',
              'Oslo',
              'Paris',
              'Rome',
              'Stockholm',
            ].map((city, row) =>
              h.tr(
                [],
                [
                  h.td([h.Class('px-3 py-2 text-muted-foreground')], [city]),
                  ...Array.from({ length: 12 }, (_, col) =>
                    h.td(
                      [h.Class('px-3 py-2 text-muted-foreground')],
                      [String(10 + ((row * 19 + col * 7) % 90))],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      )
    return page(h, 'scrollbars', settings, [
      section(h, 'The problem', [
        ...copy(h, 'scrollbars', 'The problem'),
        example(
          h,
          'Native and Fluid scrolling',
          [
            h.div(
              [h.Class('grid w-full gap-5 sm:grid-cols-2 ')],
              [
                h.div(
                  [],
                  [
                    h.h3(
                      [h.Class('text-site-title text-foreground leading-none')],
                      ['Native overflow'],
                    ),
                    h.div([h.Class('h-56 w-64 overflow-y-auto border border-border')], releases()),
                  ],
                ),
                h.div(
                  [],
                  [
                    h.h3([h.Class('text-site-title text-foreground leading-none')], ['ScrollArea']),
                    area(
                      'problem',
                      releases,
                      ' [.system-docs_&]:h-[18rem] [.system-docs_&]:border [.system-docs_&]:border-border [.system-docs_&]:rounded-[var(--system-frame-radius,_0.75rem)]',
                    ),
                  ],
                ),
              ],
            ),
          ],
          settings,
        ),
      ]),
      section(h, 'The scrollbar', [
        h.p(
          [],
          [
            'The thumb rests narrow and low-contrast, then widens and darkens on hover so it stays quiet until you reach for it. Its radius follows the shape system. On touch-primary devices the native component uses overflow scrolling and platform physics.',
          ],
        ),
        h.p(
          [],
          [
            'Scrollbar machinery in the original is adapted from Lina. This version uses the native Foldkit ScrollArea.',
          ],
        ),
        h.a([h.Href('https://lina.sameer.sh')], ['Lina']),
      ]),
      section(h, 'The fade', [
        h.p(
          [],
          [
            'A mask dissolves content toward the edges that have more to scroll, and a scroll-driven animation keeps the true start and end crisp. The scroll-fade and scroll-fade-x utilities work on the viewport.',
          ],
        ),
        example(
          h,
          'Vertical fading list',
          [
            area(
              'fade',
              releases,
              ' [.system-docs_&]:h-[18rem] [.system-docs_&]:border [.system-docs_&]:border-border [.system-docs_&]:rounded-[var(--system-frame-radius,_0.75rem)]',
              'scroll-fade',
            ),
          ],
          settings,
        ),
        h.a(
          [h.Href('https://ui.shadcn.com/docs/utils/scroll-fade')],
          ['Original shadcn scroll-fade utility'],
        ),
      ]),
      section(h, 'Examples', [
        h.h3([h.Class('text-site-title text-foreground leading-none')], ['Horizontal']),
        h.p([], ['A row wider than its container, faded with the x variant.']),
        area(
          'horizontal',
          () => [
            h.div(
              [h.Class('flex gap-2 p-3 w-max')],
              ['Inbox', 'Projects', 'Analytics', 'Automation', 'Team', 'Settings'].map((label) =>
                h.div(
                  [
                    h.Class(
                      'flex items-center justify-center h-20 w-28 shrink-0 border border-border text-site-body text-foreground',
                    ),
                  ],
                  [label],
                ),
              ),
            ),
          ],
          ' [.system-docs_&]:h-[10rem] [.system-docs_&]:border [.system-docs_&]:border-border [.system-docs_&]:rounded-[var(--system-frame-radius,_0.75rem)]',
          'scroll-fade-x',
        ),
        h.h3([h.Class('text-site-title text-foreground leading-none')], ['Double overflow']),
        h.p(
          [],
          [
            'A table taller and wider than its box. Both scrollbars and the corner remain available.',
          ],
        ),
        area(
          'both',
          () => [table()],
          ' [.system-docs_&]:h-[24rem] [.system-docs_&]:border [.system-docs_&]:border-border [.system-docs_&]:rounded-[var(--system-frame-radius,_0.75rem)]',
          'scroll-fade scroll-fade-x',
        ),
      ]),
      section(h, 'API reference', [
        snippet(
          h,
          settings,
          "ScrollAreaBlock // bind a child initialized with { id, orientation: 'both' }\n// embedView inputs: { context, viewportClassName: 'scroll-fade', content: () => [...] }",
        ),
        h.p(
          [],
          [
            'Orientation accepts vertical, horizontal, or both. RequestedScroll changes the viewport position through the component. Its view receives current presentation.',
          ],
        ),
      ]),
    ])
  }),
}).pipe(Layer.provide(ScrollLayer))
