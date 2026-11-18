import { Schema, Option } from 'effect'
import { PreviewOptions } from './legacy-options'
import { decodeConfiguration } from './configuration'
export { PreviewOptions } from './legacy-options'

export const previewOptionsFromUrl: (url: string) => PreviewOptions = (url: string) => {
  const parsedUrl = new URL(url)
  const raw = parsedUrl.searchParams.get('props')
  if (raw === null) return {}
  const tagged = decodeConfiguration(raw)
  if (Option.isSome(tagged)) {
    const value = tagged.value
    const slug = parsedUrl.pathname.split('/').filter(Boolean).at(-1)
    if ((value._tag === 'chart' ? value.slug : value._tag) !== slug) return {}
    return { configuration: raw }
  }
  try {
    return Schema.decodeUnknownSync(PreviewOptions)(JSON.parse(raw))
  } catch {
    return {}
  }
}
