// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { expect, test } from 'vitest'
import { loadingLabel } from '../loading-label'

test('keeps the mounted loading shimmer in Source UTF-16 order with intact accessible text', () => {
  const label = loadingLabel('A😀B')
  document.body.append(label.element)
  try {
    label.update(true, false)
    const characters = Array.from(label.element.querySelectorAll('.ts-bkm-loading-label-char'))
    expect(characters.map((character) => character.textContent)).toEqual([
      'A',
      '\uD83D',
      '\uDE00',
      'B',
    ])
    const styles = characters.map((character) => {
      if (!(character instanceof HTMLElement)) throw new Error('Missing shimmer span')
      return character.style
    })
    expect(styles.map((style) => style.getPropertyValue('--bkm-label-delay'))).toEqual([
      '0s',
      '0.25s',
      '0.5s',
      '0.75s',
    ])
    expect(
      styles.every(
        (style) =>
          style.getPropertyValue('--bkm-label-animation') === 'bkm-label-char-4 1.2s infinite',
      ),
    ).toBe(true)
    expect(
      label.element.querySelector('.ts-bkm-loading-label-text > span:last-child')?.textContent,
    ).toBe('A😀B')
    expect(label.element.getAttribute('aria-live')).toBe('polite')
  } finally {
    label.element.remove()
  }
})
