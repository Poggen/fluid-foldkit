import { systemClasses } from './classes'
/* @license Adapted from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
import { Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { childAttributes } from 'foldkit/html'
import { Button } from '@foldkit-visuals/fluid/button'
import { TextareaBlock, layer as TextareaLayer } from '@foldkit-visuals/fluid/textarea'
import { resolvePresentation } from '@foldkit-visuals/fluid/presentation'
import { typeStyles, typeClasses, fontWeights } from '@foldkit-visuals/fluid/tokens'
import {
  ComponentPresentation,
  presentation,
  currentFontFamily,
  headingFontPresentation,
} from '../settings'
import { copy, example, page, section, type PageInputs } from './view'
import { markdownSample, markdownView } from './typography-markdown'

const key = Symbol('TypographySystemPage')
const TypographySystemPageBlock = Block.make('TypographySystemPage', {
  key,
  InitArgs: Schema.Tuple([ComponentPresentation]),
  Model: Schema.Struct({
    editor: TextareaBlock.Model,
    selected: Schema.Boolean,
    count: Schema.Int,
    wide: Schema.Boolean,
  }),
  Message: defineMessageUnion({ ToggledWeight: {}, AdvancedCount: {}, ToggledWidth: {} }),
  InMessage: defineInMessageUnion({
    InformedOfPresentation: { presentation: ComponentPresentation },
  }),
  view: { kind: 'Element', Inputs: Block.makeInputContract<PageInputs>() },
})
export { TypographySystemPageBlock as TypographyPageBlock }
const RawEditor = TypographySystemPageBlock.makeRequiredFieldBinding(TextareaBlock, {
  field: 'editor',
  init: { contextToArgs: () => [{ id: 'system-markdown-editor', value: markdownSample }] },
})
const Editor = RawEditor.withOutMessagePolicy({
  fold: TypographySystemPageBlock.makeOutMessageFold(TextareaBlock, {
    Changed: ({ value }) => RawEditor.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})
const TypographySystemPageComposition = TypographySystemPageBlock.makeComposition({
  bindings: [Editor],
})
const roles = [
  { role: 'display', use: 'Page titles', weight: 'bold' },
  { role: 'title', use: 'Section titles', weight: 'semibold' },
  { role: 'subtitle', use: 'Sub-headings and card titles', weight: 'semibold' },
  { role: 'body', use: 'Labels, menu items, and paragraphs', weight: 'normal' },
  { role: 'caption', use: 'Descriptions and meta rows', weight: 'normal' },
] as const
const gaps = [
  ['Above display and title', 24, 16],
  ['Above subtitle', 20, 12],
  ['Below display, title, and subtitle', 8, 4],
  ['Between body blocks', 12, 8],
  ['Above caption', 8, 4],
  ['Between list items', 4, 4],
  ['Around a divider', 24, 16],
] as const

export const layer = TypographySystemPageBlock.makeLayer({
  init: TypographySystemPageComposition.makeInit(() => ({
    model: { selected: true, count: 10, wide: false },
  })),
  update: TypographySystemPageComposition.makeUpdate({
    ToggledWeight: TypographySystemPageBlock.makeFieldsStep(() => ({
      selected: (selected) => !selected,
    })),
    AdvancedCount: TypographySystemPageBlock.makeFieldsStep(() => ({
      count: (count) => (count === 48 ? 10 : count + 1),
    })),
    ToggledWidth: TypographySystemPageBlock.makeFieldsStep(() => ({ wide: (wide) => !wide })),
  }),
  inMessageUpdate: TypographySystemPageComposition.makeInMessageUpdate({
    InformedOfPresentation: TypographySystemPageBlock.makeNoopStep(),
  }),
  view: TypographySystemPageComposition.makeView.withInputs((model, { settings }, h) => {
    const context = presentation(settings)
    const font = headingFontPresentation(settings)
    const headingAttributes = (display: boolean) => [
      h.Style({
        fontFamily: font.family,
        fontWeight: String(display ? font.displayWeight : font.weight),
        fontVariationSettings:
          settings.font === 'sans' ? (display ? fontWeights.bold : fontWeights.semibold) : 'normal',
        fontSynthesisWeight: 'none',
      }),
    ]
    const pair = (
      label: string,
      first: ReturnType<typeof h.div>,
      second: ReturnType<typeof h.div>,
    ) =>
      example(
        h,
        label,
        [h.div([h.Class('grid w-full max-w-xl gap-5 sm:grid-cols-2')], [first, second])],
        settings,
      )
    const specimen = (label: string, content: ReadonlyArray<ReturnType<typeof h.div> | string>) =>
      h.div(
        [h.Class(systemClasses.typeSpecimen)],
        [
          h.div(
            [
              h.Class(
                `w-full border border-border/60 ${resolvePresentation({ context }).shape.container}`,
              ),
            ],
            content,
          ),
          h.p([h.Class(systemClasses.typeCaption)], [label]),
        ],
      )
    const toggle = (label: string, message: typeof TypographySystemPageBlock.Message.Type) =>
      Button(
        { context, variant: 'secondary', children: [label], attributes: [h.OnClick(message)] },
        h,
      )
    const wrapClasses = { wrap: 'text-wrap', balance: 'text-balance', pretty: 'text-pretty' }
    const wrapSample = (mode: 'wrap' | 'balance' | 'pretty', title: boolean) => {
      const sample = title
        ? 'Give every component the same motion'
        : 'Hover glides from item to item instead of blinking, so the highlight always sits under your cursor.'
      return h.div(
        [
          h.Class(
            ['max-w-full ' + wrapClasses[mode], model.wide ? 'w-[290px]' : 'w-[214px]'].join(' '),
          ),
        ],
        [
          title
            ? h.h3([h.Class(systemClasses.heading + ' ' + wrapClasses[mode])], [sample])
            : h.p([h.Class(wrapClasses[mode])], [sample]),
        ],
      )
    }
    return page(h, 'typography', settings, [
      section(h, '5 rules', copy(h, 'typography', '5 rules')),
      section(h, '5 no-gos', copy(h, 'typography', '5 no-gos')),
      section(h, 'The scale', [
        ...copy(h, 'typography', 'The scale'),
        h.div(
          [
            h.Class(
              `relative overflow-hidden w-full border border-border/60 ${resolvePresentation({ context }).shape.container}`,
            ),
          ],
          [
            h.div(
              [
                h.Class(systemClasses.tableScroll),
                h.Role('region'),
                h.AriaLabel('Typography scale table'),
                h.Tabindex(0),
              ],
              [
                h.table(
                  [h.Class(systemClasses.table)],
                  [
                    h.thead(
                      [],
                      [
                        h.tr(
                          [],
                          ['Role', 'Specimen', 'Default', 'Compact', 'Weight'].map((text) =>
                            h.th([h.Class(systemClasses.headerCell)], [text]),
                          ),
                        ),
                      ],
                    ),
                    h.tbody(
                      [],
                      roles.map(({ role, use, weight }) =>
                        h.tr(
                          [],
                          [
                            h.td([h.Class(systemClasses.cell)], [role]),
                            h.td(
                              [
                                h.Class(
                                  [
                                    role === 'body' || role === 'caption'
                                      ? 'text-muted-foreground'
                                      : 'text-foreground',
                                    systemClasses.cell,
                                    typeClasses[settings.size][role],
                                    role === 'display'
                                      ? 'font-heading-display'
                                      : role === 'body' || role === 'caption'
                                        ? ''
                                        : 'font-heading',
                                  ].join(' '),
                                ),
                                h.Style({
                                  fontFamily:
                                    role === 'body' || role === 'caption'
                                      ? 'var(--font-sans)'
                                      : font.family,
                                  fontWeight: String(
                                    role === 'body' || role === 'caption'
                                      ? 400
                                      : role === 'display'
                                        ? font.displayWeight
                                        : font.weight,
                                  ),
                                  fontVariationSettings:
                                    role === 'body' ||
                                    role === 'caption' ||
                                    settings.font === 'sans'
                                      ? fontWeights[weight]
                                      : 'normal',
                                  fontSynthesisWeight: 'none',
                                }),
                              ],
                              [use],
                            ),
                            h.td(
                              [h.Class(systemClasses.cell)],
                              [
                                `${typeStyles[role].default.size} / ${typeStyles[role].default.leading}px`,
                              ],
                            ),
                            h.td(
                              [h.Class(systemClasses.cell)],
                              [
                                `${typeStyles[role].compact.size} / ${typeStyles[role].compact.leading}px`,
                              ],
                            ),
                            h.td([h.Class(systemClasses.cell)], [weight]),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        h.p(
          [],
          [
            `Native micro role: ${typeStyles.micro.default.size}/${typeStyles.micro.default.leading}px default, ${typeStyles.micro.compact.size}/${typeStyles.micro.compact.leading}px compact. Reserved for key caps, counters, and initials; it is outside the five prose styles.`,
          ],
        ),
      ]),
      section(h, 'Heading font', [
        ...copy(h, 'typography', 'Heading font'),
        example(
          h,
          'Current global heading font',
          [
            h.p(
              [],
              [
                `Current family: ${currentFontFamily(settings)}. Heading weight: ${font.weight}; display weight: ${font.displayWeight}. Use the global font controls to change it.`,
              ],
            ),
            h.h2(
              [h.Class('text-site-display text-foreground'), ...headingAttributes(true)],
              ['Getting started'],
            ),
            h.h3(
              [h.Class('text-site-title text-foreground'), ...headingAttributes(false)],
              ['Install the components you need'],
            ),
            h.p([], ['Body text stays in Inter, so only the hierarchy changes voice.']),
          ],
          settings,
        ),
      ]),
      section(h, 'Markdown', [
        ...copy(h, 'typography', 'Markdown'),
        h.p(
          [],
          [
            'Edit headings, paragraphs, bold, inline code, lists, tasks, quotes, tables, or fenced code. Raw HTML is displayed as text.',
          ],
        ),
        example(
          h,
          'Editable Markdown',
          [
            h.div(
              [h.Class('grid w-full max-w-xl gap-5 sm:grid-cols-2')],
              [
                h.block(
                  Editor.embedView({
                    slotId: model.editor.id,
                    model: model.editor,
                    viewInputs: {
                      context,
                      appearance: 'editor',
                      attributes: childAttributes([h.AriaLabel('Markdown sample')]),
                    },
                  }),
                ),
                markdownView(h, model.editor.value),
              ],
            ),
          ],
          settings,
        ),
      ]),
      section(h, 'Spacing', [
        ...copy(h, 'typography', 'Spacing'),
        h.table(
          [h.Class(systemClasses.table)],
          [
            h.thead(
              [],
              [
                h.tr(
                  [],
                  ['Gap', 'Default', 'Compact'].map((text) =>
                    h.th([h.Class(systemClasses.headerCell)], [text]),
                  ),
                ),
              ],
            ),
            h.tbody(
              [],
              gaps.map(([label, normal, compact]) =>
                h.tr(
                  [],
                  [
                    h.td([h.Class(systemClasses.cell)], [label]),
                    h.td([h.Class(systemClasses.cell)], [`${normal}px`]),
                    h.td([h.Class(systemClasses.cell)], [`${compact}px`]),
                  ],
                ),
              ),
            ),
          ],
        ),
      ]),
      section(h, '5 tweaks', [
        h.p([], ['Small details that keep text still, snug in its box, and evenly wrapped.']),
        h.h3([h.Class(systemClasses.heading)], ['Weight without reflow']),
        h.p(
          [],
          [
            'Each weight carries its own optical size, so semibold labels keep their width. Idea from ',
            h.a([h.Href('https://x.com/lochieaxon/status/2061631101999968701')], ['@lochieaxon']),
            '.',
          ],
        ),
        toggle('Toggle selected weight', TypographySystemPageBlock.Message.ToggledWeight()),
        pair(
          'Compare optical sizing',
          specimen('Weight only', [
            h.span(
              [h.Style({ fontVariationSettings: model.selected ? "'wght' 550" : "'wght' 400" })],
              ['Workspace settings'],
            ),
          ]),
          specimen('Weight + optical size', [
            h.span(
              [
                h.Style({
                  fontVariationSettings: model.selected ? fontWeights.semibold : fontWeights.normal,
                }),
              ],
              ['Workspace settings'],
            ),
          ]),
        ),
        h.h3([h.Class(systemClasses.heading)], ['Steady numbers']),
        h.p(
          [],
          [
            'Changing numbers use tabular-nums so every digit is the same width and the words after them hold still.',
          ],
        ),
        toggle('Advance count', TypographySystemPageBlock.Message.AdvancedCount()),
        pair(
          'Compare numeral widths',
          specimen('Proportional digits', [
            h.span([h.Class('normal-nums')], [`Installed ${model.count} of 48 components`]),
          ]),
          specimen('Tabular digits', [
            h.span([h.Class('tabular-nums')], [`Installed ${model.count} of 48 components`]),
          ]),
        ),
        h.h3([h.Class(systemClasses.heading)], ['Trimmed labels']),
        h.p(
          [],
          [
            'Labels use text-box: trim-both cap alphabetic so the padding you set is the space you see. Idea from ',
            h.a(
              [h.Href('https://interfaces.dev/magazine/issues/working-with-type')],
              ['@jakubkrehel'],
            ),
            '.',
          ],
        ),
        pair(
          'Compare label trimming',
          specimen('Untrimmed · 8px padding', [
            h.div([h.Class(systemClasses.trimChip)], [h.span([], ['Draft saved'])]),
          ]),
          specimen('Trimmed · 8px padding', [
            h.div(
              [h.Class(systemClasses.trimChip)],
              [h.span([h.Class('[text-box:trim-both_cap_alphabetic]')], ['Draft saved'])],
            ),
          ]),
        ),
        h.p([], ['Browsers without text-box support render both chips with the same line box.']),
        h.h3([h.Class(systemClasses.heading)], ['Balanced headings']),
        h.p([], ['Headings use text-wrap: balance so their lines come out even.']),
        toggle('Change comparison width', TypographySystemPageBlock.Message.ToggledWidth()),
        pair(
          'Compare heading wrapping',
          specimen('wrap', [wrapSample('wrap', true)]),
          specimen('balance', [wrapSample('balance', true)]),
        ),
        h.h3([h.Class(systemClasses.heading)], ['Pretty paragraphs']),
        h.p([], ['Paragraphs use text-wrap: pretty so none ends on a lone word.']),
        pair(
          'Compare paragraph wrapping',
          specimen('wrap', [wrapSample('wrap', false)]),
          specimen('pretty', [wrapSample('pretty', false)]),
        ),
      ]),
    ])
  }),
}).pipe(Layer.provide(TextareaLayer))
