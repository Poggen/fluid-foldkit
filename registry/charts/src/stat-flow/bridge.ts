export const registerStatHost: () => void = function registerStatHost() {
  if (customElements.get(STAT_HOST) === undefined) {
    customElements.define(
      STAT_HOST,
      class extends HTMLElement {
        constructor() {
          super()

          const pending: unknown = Object.getOwnPropertyDescriptor(this, 'configuration')?.value
          if (typeof pending === 'string') {
            Reflect.deleteProperty(this, 'configuration')
            this.configuration = pending
          }
        }

        set configuration(value: string) {
          this.setAttribute(CONFIG_ATTRIBUTE, value)
          this.dispatchEvent(new Event(CONFIG_EVENT))
        }

        get configuration() {
          return (this.getAttribute(CONFIG_ATTRIBUTE) ?? '') satisfies string
        }
      },
    )
  }
}

export const STAT_HOST = 'fk-bklit-stat-value'

export const CONFIG_ATTRIBUTE = 'data-stat-configuration'

export const CONFIG_EVENT = 'stat-configuration-changed'
