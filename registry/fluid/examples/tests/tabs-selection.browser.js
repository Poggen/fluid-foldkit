;(() => {
  const selected = document.querySelector('[role=tab][aria-selected=true]')
  const panel = document.querySelector('[role=tabpanel]:not([hidden])')
  const pill = document.querySelector('[data-tabs-selected-pill]')
  const label = selected?.querySelector('[data-tabs-label-measure] > span:last-child')?.textContent
  const selectedRect = selected?.getBoundingClientRect()
  const pillRect = pill?.getBoundingClientRect()
  const snapshot = {
    label,
    expected: window.expectedTabLabel,
    panel: panel?.textContent,
    index: selected?.getAttribute('data-fluid-hover-index'),
    state: document.querySelector('#tabs-state')?.textContent,
    selectedRect: selectedRect?.toJSON(),
    pillRect: pillRect?.toJSON(),
    pillStyle: pill?.getAttribute('style'),
  }
  if (
    !label ||
    label !== window.expectedTabLabel ||
    label !== panel?.textContent ||
    !selectedRect ||
    !pillRect ||
    Math.abs(selectedRect.x - pillRect.x) > 2 ||
    Math.abs(selectedRect.width - pillRect.width) > 2
  ) {
    throw new Error(`Tabs selection disagrees: ${JSON.stringify(snapshot)}`)
  }
  return snapshot
})()
