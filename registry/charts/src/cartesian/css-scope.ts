export const cartesianCssScope: (id: string) => CartesianCssScope = function cartesianCssScope(
  id: string,
) {
  let className = 'bkm-scope-'

  for (let index = 0; index < id.length; index += 1) {
    // oxlint-disable-next-line unicorn/prefer-code-point -- Fixed-width UTF-16 preserves lone surrogates and code-unit boundaries.
    className += id.charCodeAt(index).toString(16).padStart(4, '0')
  }

  return { className, selector: `.${className}` }
}

export const mountCartesianCssScope: (element: HTMLElement, id: string) => () => void =
  function mountCartesianCssScope(element: HTMLElement, id: string) {
    const { className } = cartesianCssScope(id)
    const preexisting = element.classList.contains(className)
    element.classList.add(className)
    let released = false

    return () => {
      if (released) {
        return
      }

      released = true

      if (!preexisting) {
        element.classList.remove(className)
      }
    }
  }

interface CartesianCssScope {
  readonly className: string
  readonly selector: string
}
