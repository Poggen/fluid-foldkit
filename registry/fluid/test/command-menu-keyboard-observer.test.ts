// @vitest-environment happy-dom
import { expect, test, vi } from 'vitest'
import { observeCommandMenu } from '../src/command-menu-dom.js'

for (const active of ['missing', 'stale'] as const) {
  test(`native Enter emits commit intent with ${active} active descendant DOM`, () => {
    const root = document.createElement('div')
    const column = document.createElement('div')
    column.setAttribute('data-command-column', '')
    const input = document.createElement('input')
    input.setAttribute('role', 'combobox')
    if (active === 'stale') {
      const previous = document.createElement('div')
      previous.id = 'previous-command'
      previous.dataset.commandValue = 'previous'
      column.append(previous)
      input.setAttribute('aria-activedescendant', previous.id)
    }
    root.append(input, column)
    document.body.append(root)
    const move = vi.fn()
    const enter = vi.fn()
    const release = observeCommandMenu(root, {
      platform: vi.fn(),
      height: vi.fn(),
      move,
      enter,
      query: vi.fn(),
    })
    try {
      const down = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      })
      const commit = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      input.dispatchEvent(down)
      input.dispatchEvent(commit)
      expect(input.getAttribute('aria-activedescendant')).toBe(
        active === 'stale' ? 'previous-command' : null,
      )
      expect(move).toHaveBeenCalledExactlyOnceWith('next')
      expect(enter).toHaveBeenCalledExactlyOnceWith()
      expect(move.mock.invocationCallOrder[0]).toBeLessThan(enter.mock.invocationCallOrder[0] ?? 0)
      expect(down.defaultPrevented).toBe(true)
      expect(commit.defaultPrevented).toBe(true)
    } finally {
      release()
      root.remove()
    }
  })
}
