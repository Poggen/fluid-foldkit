import { Predicate } from 'effect'
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, HtmlBuilder, TaggedAttribute } from 'foldkit/html'

type Discriminator = Pick<TaggedAttribute<never>, '_tag'>
type StyleCarrier = Discriminator | { readonly attribute: Discriminator }
type StyleAttribute = ReturnType<HtmlBuilder<never>['Style']>

// Foldkit replaces Style attributes. Source components merge their defaults
// with caller CSS, including styles published through a child Binding.
export function sourceStyleAttributes<InputAttribute extends StyleCarrier>(
  defaults: Record<string, string>,
  attributes: ReadonlyArray<InputAttribute>,
): ReadonlyArray<InputAttribute | StyleAttribute> {
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

  return [{ _tag: 'Style', value: style }, ...remaining]
}

// Child-only renderers retain each published dispatcher and mount capability.
export function sourceChildStyleAttributes(
  defaults: Record<string, string>,
  attributes: ReadonlyArray<ChildAttribute>,
): ReadonlyArray<ChildAttribute> {
  return sourceStyleAttributes(defaults, attributes).flatMap((attribute) =>
    '_tag' in attribute ? childAttributes([attribute]) : [attribute],
  )
}
