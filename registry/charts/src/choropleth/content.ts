import type { Html } from 'foldkit/html'

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

export function contentChildren(content: NativeContent): ReadonlyArray<Html | string> {
  if (isArray(content)) {
    return content.flatMap(contentChildren)
  }

  if (content === null || content === undefined || typeof content === 'boolean') {
    return []
  }

  return [typeof content === 'number' ? String(content) : content]
}
