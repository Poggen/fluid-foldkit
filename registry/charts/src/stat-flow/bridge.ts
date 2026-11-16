export const STAT_HOST = 'fk-bklit-stat-value'

export const CONFIG_ATTRIBUTE = 'data-stat-configuration'

export const CONFIG_EVENT = 'stat-configuration-changed'

export function registerStatHost(): void {
  if (customElements.get(STAT_HOST) === undefined) {
    // The generic bridge survives HMR while scoped handlers own current configuration work.
    customElements.define(
      STAT_HOST,
      class extends HTMLElement {
        constructor() {
          super()
          // Initial rendering can precede the scoped mount that registers this element.
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

        get configuration(): string {
          return this.getAttribute(CONFIG_ATTRIBUTE) ?? ''
        }
      },
    )
  }
}
