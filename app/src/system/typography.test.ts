import { it } from '@effect/vitest'
import { describe, expect } from 'vitest'
import { Story } from 'foldkit'
import { componentPresentation, defaults } from '../settings'
import { TypographyPageBlock, layer } from './typography'
import { parseMarkdown } from './typography-markdown'

it.effect('preserves typography demo choices when global presentation changes', () =>
  Story.story(
    { block: TypographyPageBlock, layer },
    Story.init(componentPresentation(defaults)),
    Story.message(TypographyPageBlock.Message.ToggledWeight()),
    Story.message(TypographyPageBlock.Message.AdvancedCount()),
    Story.message(TypographyPageBlock.Message.ToggledWidth()),
    Story.models(
      Story.steps(
        Story.inMessage(
          TypographyPageBlock.InMessage.InformedOfPresentation({
            presentation: { ...componentPresentation(defaults), size: 'compact', shape: 'pill' },
          }),
        ),
      ),
      (before, after) => {
        expect(after.editor.value).toBe(before.editor.value)
        expect(after.selected).toBe(false)
        expect(after.count).toBe(11)
        expect(after.wide).toBe(true)
      },
    ),
    Story.Command.expectNone(),
  ),
)

it.effect('restarts the number comparison after the last component', () =>
  Story.story(
    { block: TypographyPageBlock, layer },
    Story.init(componentPresentation(defaults)),
    ...Array.from({ length: 39 }, () => Story.message(TypographyPageBlock.Message.AdvancedCount())),
    Story.model((model) => expect(model.count).toBe(10)),
    Story.Command.expectNone(),
  ),
)

describe('editable Markdown', () => {
  it('keeps HTML and executable link syntax as literal text', () => {
    expect(parseMarkdown('<img src=x onerror=alert(1)>\n[run](javascript:alert(1))')).toEqual([
      { kind: 'paragraph', text: '<img src=x onerror=alert(1)>' },
      { kind: 'paragraph', text: '[run](javascript:alert(1))' },
    ])
  })
  it('preserves task state, table cells, and code without interpreting code contents', () => {
    expect(
      parseMarkdown(
        '- [x] Ready\n- [ ] Waiting\n\n| Role | Use |\n| --- | --- |\n| Body | Copy |\n\n```html\n<script>alert(1)</script>\n```',
      ),
    ).toEqual([
      {
        kind: 'list',
        items: [
          { text: 'Ready', checked: true },
          { text: 'Waiting', checked: false },
        ],
      },
      {
        kind: 'table',
        rows: [
          ['Role', 'Use'],
          ['Body', 'Copy'],
        ],
      },
      { kind: 'code', text: '<script>alert(1)</script>' },
    ])
  })
})
