// File-header presentation adapted from Foldcn (MIT), copyright 2026 elianiva.
// https://github.com/elianiva/foldcn/tree/4f719c0c0961880805992032d92646b35a6006aa
import { defaultIcons } from '@foldkit-visuals/fluid/icons'
import { Button } from '@foldkit-visuals/fluid/button'
import type { PresentationContext } from '@foldkit-visuals/fluid/presentation'
import { createHighlighter } from '@tanstack/highlight/core'
import { ts } from '@tanstack/highlight/languages/ts'
import { tsx } from '@tanstack/highlight/languages/tsx'
import { json } from '@tanstack/highlight/languages/json'
import { css } from '@tanstack/highlight/languages/css'
import { shell } from '@tanstack/highlight/languages/shell'
import type { HtmlBuilder } from 'foldkit/html'

const tokenClasses: Readonly<Record<string, string>> = {
  comment: ' [.code-block_&]:text-code-comment [.dark_.code-block_&]:text-code-comment-dark',
  keyword:
    'th-keyword [.code-block_&]:text-code-keyword [.dark_.code-block_&]:text-code-keyword-dark',
  operator: ' [.code-block_&]:text-code-keyword [.dark_.code-block_&]:text-code-keyword-dark',
  string: ' [.code-block_&]:text-code-string [.dark_.code-block_&]:text-code-string-dark',
  attr: ' [.code-block_&]:text-code-string [.dark_.code-block_&]:text-code-string-dark',
  function: ' [.code-block_&]:text-code-function [.dark_.code-block_&]:text-code-function-dark',
  number: ' [.code-block_&]:text-code-number [.dark_.code-block_&]:text-code-number-dark',
  literal: ' [.code-block_&]:text-code-number [.dark_.code-block_&]:text-code-number-dark',
  type: ' [.code-block_&]:text-code-type [.dark_.code-block_&]:text-code-type-dark',
  tag: ' [.code-block_&]:text-code-type [.dark_.code-block_&]:text-code-type-dark',
}

const highlighter = createHighlighter({ languages: [ts, tsx, json, css, shell] })
const languageFor = (file: string) => {
  const extension = file.split('.').at(-1)
  if (extension === 'json' || extension === 'css' || extension === 'tsx') return extension
  if (extension === 'sh' || extension === 'bash') return 'shell'
  if (extension === 'ts' || extension === 'js' || extension === 'mjs') return 'ts'
  return 'plaintext'
}
export interface CodeBlockOptions {
  readonly code: string
  readonly filename?: string
  readonly language?: string
  readonly label?: string
  readonly context?: PresentationContext
}

/** Only presentation lives here. The document clipboard Block owns copy effects and feedback. */
export const codeBlock = <M>(options: CodeBlockOptions, h: HtmlBuilder<M>) => {
  const filename = options.filename ?? 'example.ts'
  const language = options.language ?? languageFor(filename)
  const { tokens } = highlighter.tokenize(options.code, { lang: language })
  const lines = options.code.split('\n').length
  return h.div(
    [
      h.Class(
        'min-w-0 overflow-hidden border border-border rounded-[var(--shape-card-radius,_8px)] bg-background [.authored-frame_>_&]:border-0 [.authored-frame_>_&]:[border-top:1px_solid_var(--border)] [.authored-frame_>_&]:rounded-none [.reference-preview-card_>_&]:border-0 [.reference-preview-card_>_&]:[border-top:1px_solid_var(--border)] [.reference-preview-card_>_&]:rounded-none code-block',
      ),
      h.DataAttribute('code-block', ''),
    ],
    [
      h.div(
        [
          h.Class(
            'flex items-center gap-3 min-h-[42px] pt-1 pr-3 pb-1 pl-4.5 [border-bottom:1px_solid_var(--border)] text-muted-foreground text-[11px] ',
          ),
        ],
        [
          h.code(
            [
              h.Class(
                'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap code-block-filename',
              ),
            ],
            [filename],
          ),
          h.span(
            [h.Class('ml-auto whitespace-nowrap ')],
            [`${lines} ${lines === 1 ? 'line' : 'lines'}`],
          ),
          Button(
            {
              ...(options.context === undefined ? {} : { context: options.context }),
              variant: 'ghost',
              buttonSize: 'compact',
              children: ['Copy'],
              leadingIcon: defaultIcons.copy,
              attributes: [
                h.Type('button'),
                h.DataAttribute('code-copy', ''),
                h.AriaLabel('Copy code'),
                h.Title(`Copy ${filename}`),
              ],
            },
            h,
          ),
        ],
      ),
      h.pre(
        [
          h.Class(
            '[.code-block_&]:mt-0 [.code-block_&]:mr-0 [.code-block_&]:mb-0 [.code-block_&]:ml-0 [.code-block_&]:pt-5 [.code-block_&]:pr-5 [.code-block_&]:pb-5 [.code-block_&]:pl-5 [.code-block_&]:max-h-[560px] [.code-block_&]:[background:color-mix(in_oklab,_var(--muted)_35%,_var(--background))] [.code-block_&]:text-foreground [.code-block_&]:border-0 [.code-block_&]:rounded-none [.code-block_&]:overflow-auto [.code-block_&]:overscroll-contain [.code-block_&]:[font:12px/1.75_ui-monospace,_SFMono-Regular,_Menlo,_monospace] [.code-block_&]:whitespace-pre [.code-block_&]:[tab-size:2] reference-code ',
          ),
          h.Role('region'),
          h.Tabindex(0),
          h.AriaLabel(options.label ?? filename),
          h.DataAttribute('language', language),
        ],
        [
          h.code(
            [],
            tokens.map((token) =>
              token.className === undefined
                ? token.value
                : h.span(
                    [
                      h.Class(tokenClasses[token.className] ?? `th-${token.className}`),
                      h.DataAttribute('code-token', ''),
                    ],
                    [token.value],
                  ),
            ),
          ),
        ],
      ),
    ],
  )
}
