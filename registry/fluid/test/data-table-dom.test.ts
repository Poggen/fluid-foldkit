// oxlint-disable-next-line landmines-style/no-comments -- Required Vitest environment directive.
// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { Message } from '../src/data-table-definition.js'
import { observeDataTable } from '../src/data-table-dom.js'

let release = () => {}
afterEach(() => {
  release()
  document.body.replaceChildren()
})

const fixture = () => {
  const root = document.createElement('div')
  root.id = 'grid-bridge'
  root.setAttribute('data-fluid-data-table', '')
  root.setAttribute('data-grid-selected', '')
  root.setAttribute('data-grid-all-rows', 'a\u001fb\u001fc')
  root.setAttribute('data-grid-columns', 'name\u001femail')
  root.innerHTML = `<button data-grid-action="header" data-grid-column="name">Name</button><table><tbody>${['a', 'b', 'c'].map((id) => `<tr data-grid-body-row data-grid-row="${id}"><td><button data-grid-action="select" data-grid-row="${id}" aria-checked="false">Select ${id}</button></td><td tabindex="0" data-grid-cell data-grid-editable="true" data-grid-row="${id}" data-grid-column="name">Name ${id}</td><td tabindex="-1" data-grid-cell data-grid-row="${id}" data-grid-column="email">Email ${id}</td></tr>`).join('')}</tbody></table>`
  document.body.append(root)
  const messages: Array<typeof Message.Type> = []
  release = observeDataTable(root, (message) => messages.push(message), Message)
  return { root, messages }
}

describe('DataTable browser interaction bridge', () => {
  it('opens a primary header menu and reserves Shift click for multi sort', () => {
    const { root, messages } = fixture()
    const header = root.querySelector('button')
    header?.click()
    header?.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }))
    expect(messages).toEqual([
      Message.MenuChanged({ menu: { kind: 'column', id: 'name' } }),
      Message.SortChanged({ id: 'name', multi: true }),
    ])
  })
  it('extends checkbox selection across the visible range and stops delivering after unmount', () => {
    const { root, messages } = fixture()
    root.querySelector<HTMLButtonElement>('[data-grid-row="a"][data-grid-action="select"]')?.click()
    root
      .querySelector('[data-grid-row="c"][data-grid-action="select"]')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }))
    expect(messages).toEqual(
      ['a', 'a', 'b', 'c'].map((id) => Message.SelectionChanged({ id, selected: true })),
    )
    release()
    root.querySelector<HTMLButtonElement>('[data-grid-action="header"]')?.click()
    expect(messages).toHaveLength(4)
  })
  it('activates an editable cell using F2 but lets a native rich editor own Enter', () => {
    const { root, messages } = fixture()
    const cell = root.querySelector('[data-grid-cell]')
    cell?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true }),
    )
    expect(messages).toEqual([Message.EditStarted({ rowId: 'a', columnId: 'name' })])
    const rich = document.createElement('div')
    rich.setAttribute('data-grid-rich-editor', '')
    const input = document.createElement('input')
    rich.append(input)
    cell?.append(rich)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    )
    expect(messages).toHaveLength(1)
  })
  it('selects every filtered row across pages with Mod+A and respects native text fields', () => {
    const { root, messages } = fixture()
    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true }),
    )
    expect(messages).toEqual([Message.AllSelectionChanged({ selected: true })])
    const input = document.createElement('input')
    root.append(input)
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true, cancelable: true }),
    )
    expect(messages).toHaveLength(1)
  })
  it('uses the row under the pointer for selection while page focus is elsewhere', () => {
    const { root, messages } = fixture()
    root
      .querySelector('[data-grid-cell]')
      ?.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }))
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', bubbles: true, cancelable: true }),
    )
    expect(messages).toEqual([Message.SelectionChanged({ id: 'a', selected: true })])
  })
  it('reorders a column from its portalled menu using Alt and arrow keys', () => {
    const { root, messages } = fixture()
    const menu = document.createElement('div')
    menu.id = `${root.id}-view-menu`
    const item = document.createElement('div')
    item.dataset.gridColumnMenuRow = 'name'
    item.dataset.gridColumn = 'name'
    item.dataset.gridDrag = 'column-menu'
    item.tabIndex = 0
    menu.append(item)
    document.body.append(menu)
    const key = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      altKey: true,
      bubbles: true,
      cancelable: true,
    })
    item.dispatchEvent(key)
    expect(key.defaultPrevented).toBe(true)
    expect(messages).toEqual([Message.ColumnOrderChanged({ ids: ['email', 'name'] })])
  })
  it('closes a collapsible search on Escape before outer handlers run', () => {
    const { root, messages } = fixture()
    const search = document.createElement('input')
    search.type = 'search'
    search.dataset.gridSearchInput = ''
    search.dataset.gridSearchCollapsible = 'true'
    const button = document.createElement('button')
    button.dataset.gridSearchButton = ''
    root.append(search, button)
    search.focus()
    let escaped = false
    const outside = () => {
      escaped = true
    }
    document.addEventListener('keydown', outside)
    search.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
    document.removeEventListener('keydown', outside)
    expect(messages).toEqual([Message.SearchClosed()])
    expect(escaped).toBe(false)
  })
})
