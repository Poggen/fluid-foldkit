export const DrawingElementBase =
  typeof HTMLElement === 'undefined'
    ? undefined
    : class extends HTMLElement {
        acquire(_clock: () => number): () => void
        acquire(_clock: () => number): never {
          throw new TypeError(`${this.localName} drawing host must implement resource acquisition`)
        }
      }
