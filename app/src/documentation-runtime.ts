type DocumentationRuntime = typeof import('./documentation-implementation')

const makeDocumentationLoader = () => {
  let runtime: DocumentationRuntime | undefined
  const ready = (path: string): boolean => path === '/' || runtime !== undefined

  return {
    ready,
    prepare: (path: string): Promise<void> => {
      if (ready(path)) return Promise.resolve()
      return import('./documentation-implementation').then((loaded) => {
        runtime = loaded
      })
    },
    read: (): DocumentationRuntime => {
      if (runtime === undefined) throw new Error('Documentation must be prepared before rendering')
      return runtime
    },
  }
}

// The module namespace is immutable and shared for this JavaScript realm, just like import().
// User settings and route ownership remain in the application Model.
const documentation = makeDocumentationLoader()
export const prepareDocumentation = documentation.prepare
export const documentationRuntime = documentation.read
