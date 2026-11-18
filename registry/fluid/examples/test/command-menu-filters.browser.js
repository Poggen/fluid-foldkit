;(() => {
  const state = JSON.parse(document.querySelector('#filter-state').textContent)
  const row = document.querySelector('[data-slot="command-menu-filters"]')
  const tabs = document.querySelector('[data-slot="command-menu-tabs"]')
  const assert = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const near = (actual, expected, name) =>
    assert(Math.abs(actual - expected) < 0.75, `${name}: ${actual} != ${expected}`)
  const style = getComputedStyle(row)
  assert(style.flexWrap === (tabs ? 'nowrap' : 'wrap'), 'Filter wrapping does not match its layout')
  if (!tabs) {
    near(parseFloat(style.paddingLeft), state.compact ? 8 : 10, 'Wrapper left padding')
    near(parseFloat(style.paddingBottom), state.compact ? 6 : 8, 'Wrapper bottom padding')
  } else {
    near(parseFloat(style.paddingLeft), 0, 'Trailing filter padding')
    near(
      parseFloat(getComputedStyle(tabs).paddingLeft),
      state.compact ? 8 : 10,
      'Tabs ambient padding',
    )
  }
  for (const selector of [
    '#filters-type [role="combobox"]',
    '#filters-sort [role="combobox"]',
    '#filter-reset',
  ]) {
    const element = document.querySelector(selector)
    near(element.getBoundingClientRect().height, 28, `${selector} height`)
    near(parseFloat(getComputedStyle(element).fontSize), 12, `${selector} font`)
    near(
      parseFloat(getComputedStyle(element).paddingRight),
      selector === '#filter-reset' ? 12 : 10,
      `${selector} padding`,
    )
    near(
      parseFloat(getComputedStyle(element).borderTopLeftRadius),
      1,
      `${selector} inherited shape`,
    )
  }
  near(
    document.querySelector('#filter-explicit').getBoundingClientRect().height,
    36,
    'Explicit default override',
  )
  if (tabs)
    near(
      document.querySelector('#ambient-trailing').getBoundingClientRect().height,
      state.compact ? 28 : 36,
      'Ambient trailing control',
    )
  const popup = document.querySelector('[role="listbox"]')
  if (popup) {
    assert(popup.classList.contains('bg-surface-6'), 'Popup lost inherited surface offset')
    for (const option of popup.querySelectorAll('[role="option"]')) {
      near(option.getBoundingClientRect().height, 28, 'Popup compact row height')
      near(parseFloat(getComputedStyle(option).fontSize), 12, 'Popup compact row font')
      near(parseFloat(getComputedStyle(option).borderTopLeftRadius), 1, 'Popup inherited shape')
      assert(
        option.querySelector('.lucide-settings')?.getAttribute('width') === '14',
        'Popup lost inherited compact icon',
      )
    }
  }
  const icon = document.querySelector('#filters-type .lucide-settings')
  assert(icon?.getAttribute('width') === '14', 'Icon override or compact icon size lost')
  return {
    compact: state.compact,
    layout: tabs ? 'trailing' : 'standalone',
    filter: state.filter,
    sort: state.sort,
  }
})()
