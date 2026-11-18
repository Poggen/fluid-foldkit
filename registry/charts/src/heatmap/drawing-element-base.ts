export const DrawingElementBase =
  typeof HTMLElement === 'undefined'
    ? undefined
    : class extends HTMLElement {
        acquire(_clock: () => number, _currentDate: Readonly<Date>): () => void
        acquire(_clock: () => number, _currentDate: Readonly<Date>): never {
          throw new TypeError(
            `Heatmap drawing host ${this.localName} must implement resource acquisition`,
          )
        }
      }
