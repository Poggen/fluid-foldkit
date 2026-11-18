// Derived from Fluid Functionalism f8014098. MIT, copyright 2026 Micka Touillaud.
import type { ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import { Button } from './button.js'
import {
  createPresentationContext,
  resolvePresentation,
  type Presentation,
} from './presentation.js'
import { cn } from './lib/utils.js'

export interface CodeBlockProps extends Presentation {
  readonly code: string
  readonly language?: string
  readonly title?: Html | string
  readonly filename?: string
  /** Highlighted markup owns its pre element and line numbering. No highlighter is bundled. */
  readonly children?: ReadonlyArray<Html | string>
  readonly lineNumbers?: boolean
  readonly wrap?: boolean
  readonly maxHeight?: number
  readonly hideHeader?: boolean
  readonly showLineCount?: boolean
  readonly label?: string
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  /** Composition seam for a clipboard owner, including document-wide copy controls. */
  readonly copyControl?: () => Html
  readonly scroll?: (content: Html, viewportClassName: string) => Html
}

/** Presentation for an existing clipboard owner. Use CodeBlockBlock for a standalone interactive block. */
export function CodeBlock<Message, R>(props: CodeBlockProps, h: HtmlBuilder<Message, R>): Html {
  const p = resolvePresentation(props)
  const lines = props.code.replace(/\n$/, '').split('\n')
  const heading = props.title ?? props.filename ?? props.language ?? ''
  const copy =
    props.copyControl?.() ??
    Button(
      {
        context: createPresentationContext(props),
        variant: 'ghost',
        buttonSize: 'icon-compact',
        children: [],
        leadingIcon: p.icons.copy,
        attributes: [
          h.Type('button'),
          h.AriaLabel('Copy code'),
          h.Title('Copy code'),
          h.DataAttribute('code-copy', ''),
        ],
      },
      h,
    )
  const content = h.div(
    [
      h.Class(
        cn(
          'w-max min-w-full font-mono px-[1em] py-[0.75em] [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:p-0 [&_pre]:[font:inherit]',
          p.size.type.caption,
          !props.hideHeader && 'pt-0',
          props.hideHeader && 'pr-10',
          props.wrap && 'w-full',
          props.wrap ? '[&_pre]:whitespace-pre-wrap [&_pre]:break-words' : '[&_pre]:whitespace-pre',
        ),
      ),
    ],
    props.children ?? [
      h.pre(
        [],
        [
          h.code(
            [],
            props.lineNumbers
              ? lines.map((line, index) =>
                  h.span(
                    [h.Class('flex'), h.DataAttribute('code-line', String(index + 1))],
                    [
                      h.span(
                        [
                          h.AriaHidden(true),
                          h.Style({ width: `${String(lines.length).length}ch` }),
                          h.Class(
                            'mr-4 shrink-0 select-none text-right tabular-nums text-muted-foreground',
                          ),
                        ],
                        [String(index + 1)],
                      ),
                      h.span([h.Class('min-w-0 flex-1')], [line || '\n']),
                    ],
                  ),
                )
              : [props.code],
          ),
        ],
      ),
    ],
  )
  const viewportClassName =
    props.maxHeight === undefined ? 'scroll-fade-x' : 'max-h-(--code-max-height) scroll-fade'
  return h.div(
    [
      h.Class(
        cn(
          'code-block relative w-full min-w-0 overflow-hidden bg-current/7 text-foreground',
          p.shape.bg,
          props.className,
        ),
      ),
      h.DataAttribute('slot', 'code-block'),
      h.DataAttribute('code-block', ''),
      ...(props.maxHeight === undefined
        ? []
        : [h.Style({ '--code-max-height': `${props.maxHeight}px` })]),
      ...(props.attributes ?? []),
    ],
    [
      props.hideHeader
        ? h.div([h.Class('absolute right-1.5 top-1.5 z-10')], [copy])
        : h.div(
            [
              h.Class(
                cn(
                  'flex items-center justify-between gap-2 pr-1.5 pl-[1em]',
                  p.size.type.caption,
                  p.size.variant === 'compact' ? 'h-8' : 'h-9',
                ),
              ),
            ],
            [
              h.span(
                [h.Class('min-w-0 truncate text-muted-foreground code-block-filename')],
                [heading],
              ),
              ...(props.showLineCount
                ? [
                    h.span(
                      [h.Class('ml-auto whitespace-nowrap text-muted-foreground')],
                      [`${lines.length} ${lines.length === 1 ? 'line' : 'lines'}`],
                    ),
                  ]
                : []),
              copy,
            ],
          ),
      props.scroll?.(content, viewportClassName) ??
        h.div(
          [
            h.Class(cn('overflow-auto overscroll-contain', viewportClassName)),
            h.Tabindex(0),
            h.Role('region'),
            h.AriaLabel(props.label ?? props.filename ?? props.language ?? 'Code'),
            h.DataAttribute('language', props.language ?? 'plaintext'),
          ],
          [content],
        ),
    ],
  )
}
