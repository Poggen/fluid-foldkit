// oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
/** @param {boolean} value @param {string} message */
const assert = (value, message) => {
  if (!value) {
    throw new Error(message)
  }
}

// oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
/** @param {string} selector */
const query = (selector) => {
  const element = document.querySelector(selector)

  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing ${selector}`)
  }

  return element
}

// oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
/** @param {() => boolean} predicate @param {string} label */
const wait = async (predicate, label) => {
  for (let frame = 0; frame < 180; frame += 1) {
    if (predicate()) {
      return
    }

    // oxlint-disable-next-line landmines-style/no-comments -- Required compiler JSDoc directive.
    /** @type {Promise<void>} */
    const pendingFrame = new Promise((resolve) => {
      requestAnimationFrame(() => {
        resolve()
      })
    })

    await pendingFrame
  }

  throw new Error(`No ${label}`)
}

// oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
/** @param {HTMLTableRowElement} row */
const firstCell = (row) => {
  const cell = row.cells.item(0)

  if (!(cell instanceof HTMLTableCellElement)) {
    throw new Error('Missing first table cell')
  }

  return cell
}

export const runTable = async () => {
  // oxlint-disable-next-line landmines-style/no-comments -- Required compiler JSDoc directive.
  /** @typedef {{ height: number, border: string, weight: string, active: boolean, colors: string[] }} RowTrace */
  // oxlint-disable-next-line landmines-style/no-comments -- Required compiler JSDoc directive.
  /** @type {{ size: string, name: string, rows: RowTrace[] }[]} */
  const traces = []

  for (const size of ['default', 'compact']) {
    const table = query(size === 'default' ? '#normal-table' : '#compact-table')

    if (!(table instanceof HTMLTableElement)) {
      throw new Error('Missing semantic table')
    }

    const region = table.parentElement

    if (!(region instanceof HTMLElement)) {
      throw new Error('Missing positioned table wrapper')
    }

    const first = query(`#${size}-row-0`)

    if (!(first instanceof HTMLTableRowElement)) {
      throw new Error('Missing first body row')
    }

    const second = query(`#${size}-row-1`)

    if (!(second instanceof HTMLTableRowElement)) {
      throw new Error('Missing second body row')
    }

    const header = table.querySelector('thead tr')

    if (!(header instanceof HTMLTableRowElement)) {
      throw new Error('Missing semantic table header')
    }

    const highlight = () => region.querySelector('[data-slot=fluid-hover-highlight]')

    // oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
    /** @param {HTMLElement} element */
    const move = (element) => {
      const rect = element.getBoundingClientRect()
      element.dispatchEvent(
        new MouseEvent('mouseover', {
          bubbles: true,
          clientX: rect.left + 10,
          clientY: rect.top + rect.height / 2,
        }),
      )

      region.dispatchEvent(new MouseEvent('mouseenter'))
      element.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: rect.left + 10,
          clientY: rect.top + rect.height / 2,
        }),
      )
    }

    // oxlint-disable-next-line landmines-style/no-comments -- Required checkJs compiler JSDoc.
    /** @param {string} name */
    const observe = async (name) => {
      await wait(
        () =>
          table
            .getAnimations({ subtree: true })
            .every((animation) => animation.playState !== 'running'),
        'settled table color transitions',
      )
      traces.push({
        size,
        name,
        rows: [...table.querySelectorAll('tr')].map((row) => ({
          height: row.getBoundingClientRect().height,
          border: getComputedStyle(row).borderBottomColor,
          weight: getComputedStyle(row).fontVariationSettings,
          active: row.classList.contains('is-active'),
          colors: [...row.cells].map((cell) => getComputedStyle(cell).color),
        })),
      })
    }

    await wait(() => first.getBoundingClientRect().height > 0, 'table layout')

    await observe('resting')

    move(first)

    await wait(() => {
      const activeHighlight = highlight()

      return (
        first.classList.contains('is-active') &&
        activeHighlight !== null &&
        getComputedStyle(activeHighlight).opacity === '1'
      )
    }, 'first row highlight')

    await wait(
      () =>
        getComputedStyle(header).borderBottomColor === 'rgba(0, 0, 0, 0)' &&
        getComputedStyle(first).borderBottomColor === 'rgba(0, 0, 0, 0)',
      'borders around first row fade',
    )

    await wait(
      () => getComputedStyle(firstCell(first)).color === getComputedStyle(firstCell(header)).color,
      'active cell foreground',
    )

    await observe('first-active')

    move(second)

    await wait(
      () => second.classList.contains('is-active') && !first.classList.contains('is-active'),
      'second row activation',
    )

    await wait(
      () =>
        getComputedStyle(second).borderBottomColor === 'rgba(0, 0, 0, 0)' &&
        getComputedStyle(header).borderBottomColor !== 'rgba(0, 0, 0, 0)',
      'border follows second row',
    )

    await wait(
      () => getComputedStyle(firstCell(second)).color === getComputedStyle(firstCell(header)).color,
      'second foreground',
    )

    await observe('second-active')

    move(header)

    await wait(
      () => !highlight() && !second.classList.contains('is-active'),
      'header does not register as a body item',
    )

    await wait(
      () =>
        getComputedStyle(first).borderBottomColor === getComputedStyle(second).borderBottomColor &&
        getComputedStyle(firstCell(first)).color === getComputedStyle(firstCell(second)).color,
      'table resting colors',
    )

    await observe('header-cleared')

    assert(
      table.querySelectorAll('th').length === 3 && table.querySelectorAll('td').length === 9,
      'Table semantics changed',
    )
  }

  return { status: 'passed', traces }
}
