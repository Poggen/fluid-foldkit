// Adapted from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud.
import type { HtmlBuilder, Html } from 'foldkit/html'

export const markdownSample = `# A single type system

## A familiar rhythm

Markdown uses the **same styles** as the rest of the interface. Inline \`code\` stays readable.

### Before you ship

- [x] Match the heading hierarchy
- [ ] Check the compact layout
- Keep the body copy clear

> Good rules hold every kind of component.

| Role | Use |
| --- | --- |
| Body | Paragraphs and labels |
| Caption | Supporting information |`

export type MarkdownBlock =
  | { readonly kind: 'heading'; readonly level: number; readonly text: string }
  | { readonly kind: 'paragraph' | 'quote' | 'code'; readonly text: string }
  | {
      readonly kind: 'list'
      readonly items: ReadonlyArray<{ readonly text: string; readonly checked: boolean | null }>
    }
  | { readonly kind: 'table'; readonly rows: ReadonlyArray<ReadonlyArray<string>> }

const cells = (line: string) =>
  line
    .replace(/^\||\|$/gu, '')
    .split('|')
    .map((cell) => cell.trim())
export function parseMarkdown(source: string): ReadonlyArray<MarkdownBlock> {
  const lines = source.replace(/\r\n/gu, '\n').split('\n')
  const blocks: MarkdownBlock[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (!line.trim()) {
      index++
      continue
    }
    if (line.startsWith('```')) {
      const code: string[] = []
      index++
      while (index < lines.length && !lines[index]?.startsWith('```'))
        code.push(lines[index++] ?? '')
      index++
      blocks.push({ kind: 'code', text: code.join('\n') })
      continue
    }
    const heading = /^(#{1,6})\s+(.+)$/u.exec(line)
    if (heading !== null) {
      blocks.push({ kind: 'heading', level: heading[1]?.length ?? 1, text: heading[2] ?? '' })
      index++
      continue
    }
    if (line.startsWith('|') && /^\|?[\s:|-]+\|?$/u.test(lines[index + 1] ?? '')) {
      const rows = [cells(line)]
      index += 2
      while (lines[index]?.startsWith('|')) rows.push(cells(lines[index++] ?? ''))
      blocks.push({ kind: 'table', rows })
      continue
    }
    if (/^[-*] /u.test(line)) {
      const items: Array<{ text: string; checked: boolean | null }> = []
      while (/^[-*] /u.test(lines[index] ?? '')) {
        const content = (lines[index++] ?? '').slice(2)
        const task = /^\[([ xX])\]\s+(.*)$/u.exec(content)
        items.push({ text: task?.[2] ?? content, checked: task === null ? null : task[1] !== ' ' })
      }
      blocks.push({ kind: 'list', items })
      continue
    }
    blocks.push({
      kind: line.startsWith('> ') ? 'quote' : 'paragraph',
      text: line.replace(/^> /u, ''),
    })
    index++
  }
  return blocks
}

const inline = <M>(h: HtmlBuilder<M>, text: string): ReadonlyArray<Html | string> =>
  text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/gu)
    .map((part) =>
      part.startsWith('**')
        ? h.strong([], [part.slice(2, -2)])
        : part.startsWith('`')
          ? h.code([], [part.slice(1, -1)])
          : part,
    )

export const markdownView = <M>(h: HtmlBuilder<M>, source: string) =>
  h.div(
    [h.Class('min-w-0 overflow-auto typeset system-markdown-preview')],
    parseMarkdown(source).map((block) => {
      if (block.kind === 'heading') {
        const content = inline(h, block.text)
        return block.level === 1
          ? h.h1([h.Class('text-site-display text-foreground leading-none')], content)
          : block.level === 2
            ? h.h2([h.Class('text-site-title text-foreground leading-none')], content)
            : h.h3([h.Class('text-site-title text-foreground leading-none')], content)
      }
      if (block.kind === 'code') return h.pre([], [h.code([], [block.text])])
      if (block.kind === 'quote') return h.blockquote([], [h.p([], inline(h, block.text))])
      if (block.kind === 'list')
        return h.ul(
          [],
          block.items.map((item) =>
            h.li(
              [],
              [
                ...(item.checked === null
                  ? []
                  : [
                      h.input([
                        h.Type('checkbox'),
                        h.Checked(item.checked),
                        h.Disabled(true),
                        h.AriaLabel(item.text),
                      ]),
                    ]),
                ...inline(h, item.text),
              ],
            ),
          ),
        )
      if (block.kind === 'table') {
        const [header = [], ...rows] = block.rows
        return h.table(
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
                  header.map((cell) =>
                    h.th([h.Class('px-3 py-2 text-left text-foreground')], inline(h, cell)),
                  ),
                ),
              ],
            ),
            h.tbody(
              [],
              rows.map((row) =>
                h.tr(
                  [],
                  row.map((cell) =>
                    h.td([h.Class('px-3 py-2 text-muted-foreground')], inline(h, cell)),
                  ),
                ),
              ),
            ),
          ],
        )
      }
      return h.p([], inline(h, block.text))
    }),
  )
