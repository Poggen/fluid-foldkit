import { Predicate } from 'effect'
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, HtmlBuilder, TaggedAttribute } from 'foldkit/html'

export const sourceStyleAttributes: <InputAttribute extends StyleCarrier>(
  defaults: Record<string, string>,
  attributes: ReadonlyArray<InputAttribute>,
) => ReadonlyArray<InputAttribute | StyleAttribute> = function sourceStyleAttributes<
  InputAttribute extends StyleCarrier,
>(defaults: Record<string, string>, attributes: ReadonlyArray<InputAttribute>) {
  const style = { ...defaults }
  const remaining = attributes.filter((attribute) => {
    const tagged = '_tag' in attribute ? attribute : attribute.attribute
    if (tagged._tag !== 'Style') return true

    if ('value' in tagged && Predicate.isObject(tagged.value)) {
      for (const [key, value] of Object.entries(tagged.value)) {
        if (Predicate.isString(value)) style[key] = value
      }
    }
    return false
  })

  return [{ _tag: 'Style', value: style }, ...remaining] satisfies ReadonlyArray<
    InputAttribute | StyleAttribute
  >
}

export const sourceChildStyleAttributes: (
  defaults: Record<string, string>,
  attributes: ReadonlyArray<ChildAttribute>,
) => ReadonlyArray<ChildAttribute> = function sourceChildStyleAttributes(
  defaults: Record<string, string>,
  attributes: ReadonlyArray<ChildAttribute>,
) {
  return sourceStyleAttributes(defaults, attributes).flatMap((attribute) =>
    '_tag' in attribute ? childAttributes([attribute]) : [attribute],
  )
}

type Discriminator = Pick<TaggedAttribute<never>, '_tag'>
type StyleCarrier = Discriminator | { readonly attribute: Discriminator }
type StyleAttribute = ReturnType<HtmlBuilder<never>['Style']>
