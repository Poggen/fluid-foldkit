import type { Html } from 'foldkit/html'

export const contentChildren: (content: NativeContent) => ReadonlyArray<Html | string> = function (
  content: NativeContent,
) {
  if (isArray(content)) {
    return content.flatMap(contentChildren)
  }

  if (content === null || content === undefined || typeof content === 'boolean') {
    return []
  }

  return [typeof content === 'number' ? String(content) : content]
}

export type NativeContent =
  | Html
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlyArray<NativeContent>

const isArray = (content: NativeContent): content is ReadonlyArray<NativeContent> =>
  Array.isArray(content)
