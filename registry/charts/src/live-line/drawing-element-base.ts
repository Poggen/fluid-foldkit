export const DrawingElementBase =
  typeof HTMLElement === 'undefined'
    ? undefined
    : class extends HTMLElement {
        acquire(_clock: () => number, _wallClock: () => number): () => void
        acquire(_clock: () => number, _wallClock: () => number): never {
          throw new TypeError(
            `LiveLine drawing host ${this.localName} must implement resource acquisition`,
          )
        }
      }
