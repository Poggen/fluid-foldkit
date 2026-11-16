export const DrawingElementBase =
  typeof HTMLElement === 'undefined'
    ? undefined
    : class extends HTMLElement {
        acquire(_clock: () => number, _wallClock: () => number): () => void {
          throw new TypeError(
            `LiveLine drawing host ${this.localName} must implement resource acquisition`,
          )
        }
      }
