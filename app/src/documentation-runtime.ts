type DocumentationRuntime = typeof import('./documentation-implementation')

const makeDocumentationLoader = () => {
  let runtime: DocumentationRuntime | undefined
  const ready: (path: string) => boolean = (path: string) => path === '/' || runtime !== undefined

  return {
    ready,
    prepare: (path: string) => {
      if (ready(path)) return Promise.resolve() satisfies Promise<void>
      return import('./documentation-implementation').then((loaded) => {
        runtime = loaded
      }) satisfies Promise<void>
    },
    read: () => {
      if (runtime === undefined) throw new Error('Documentation must be prepared before rendering')
      return runtime satisfies DocumentationRuntime
    },
  }
}

const documentation = makeDocumentationLoader()
export const prepareDocumentation = documentation.prepare
export const documentationRuntime = documentation.read
