import { Schema } from 'effect'
import NumberFlowLite, { define, formatToData } from 'number-flow/lite'
import { defaultChartStatFlowFormat, statFlowCodec } from './props.js'

import { STAT_HOST, CONFIG_ATTRIBUTE, CONFIG_EVENT, registerStatHost } from './bridge.js'

const NUMBER_TAG = 'fk-bklit-stat-number'

export function registerStatNumber(): void {
  if (customElements.get(NUMBER_TAG) === undefined) {
    define(NUMBER_TAG, class extends NumberFlowLite {})
  }

  registerStatHost()
}

export function mountStatNumber(element: Element): () => void {
  if (!(element instanceof HTMLElement) || element.localName !== STAT_HOST) {
    throw new TypeError('ChartStatFlow requires its registered value element')
  }

  const shadow = element.shadowRoot ?? element.attachShadow({ mode: 'open' })
  const number = element.ownerDocument.createElement(NUMBER_TAG)

  if (!(number instanceof NumberFlowLite)) {
    throw new TypeError('ChartStatFlow requires its native NumberFlow element')
  }

  number.batched = false
  number.dataset.willChange = ''
  let previous = ''

  const update = (force: boolean) => {
    const encoded = element.getAttribute(CONFIG_ATTRIBUTE)

    if (encoded === null) {
      throw new TypeError('ChartStatFlow configuration is absent')
    }

    const props = Schema.decodeSync(statFlowCodec)(encoded)

    const signature = JSON.stringify([
      Object.is(props.value, -0) ? '-0' : String(props.value),
      props.formatOptions ?? defaultChartStatFlowFormat,
      props.prefix,
      props.suffix,
    ])

    if (!force && signature === previous) {
      return
    }

    previous = signature
    number.data = formatToData(
      props.value,
      new Intl.NumberFormat(undefined, props.formatOptions ?? defaultChartStatFlowFormat),
      props.prefix,
      props.suffix,
    )
  }

  const changed = () => {
    update(false)
  }

  element.addEventListener(CONFIG_EVENT, changed)

  try {
    update(true)
    shadow.replaceChildren(number)
    // React19 primes data before insertion and reapplies it in componentDidMount.
    update(true)
  } catch (error) {
    element.removeEventListener(CONFIG_EVENT, changed)
    number.animated = false
    number.remove()
    shadow.replaceChildren(element.ownerDocument.createElement('slot'))
    throw error
  }

  return () => {
    element.removeEventListener(CONFIG_EVENT, changed)
    // The engine waits on animation.finished; its public setter finishes without rejecting it.
    number.animated = false
    number.remove()
    shadow.replaceChildren(element.ownerDocument.createElement('slot'))
  }
}
