/* @license File-header presentation adapted from Foldcn (MIT), copyright 2026 elianiva. */

import { CodeBlock } from '@foldkit-visuals/fluid/code-block/parts'
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
export const highlightedCode = <M>(code: string, language: string, h: HtmlBuilder<M>) => {
  const { tokens } = highlighter.tokenize(code, { lang: language })
  return h.pre(
    [h.Class('reference-code'), h.DataAttribute('language', language)],
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
  )
}

export const codeBlock = <M>(options: CodeBlockOptions, h: HtmlBuilder<M>) => {
  const filename = options.filename ?? 'example.ts'
  const language = options.language ?? languageFor(filename)
  return CodeBlock(
    {
      ...options,
      filename,
      language,
      maxHeight: 560,
      showLineCount: true,
      className: '[.authored-frame_>_&]:rounded-none [.reference-preview-card_>_&]:rounded-none',
      children: [highlightedCode(options.code, language, h)],
    },
    h,
  )
}
