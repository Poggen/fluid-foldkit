import { Result } from 'effect'
import { ReferenceQuery } from './reference/query'
import { pageAt } from '../../lib/catalogue'
import { SearchBlock } from './search'
import { NavigationBlock } from './navigation'
import { componentPresentation, type Settings } from './settings'
import { ApplicationBlock } from './application-contract'
import { PreferencesBlock } from './preferences'
import { GoogleFontPickerBlock } from './fonts/picker'
import { SystemPagesBlock } from './system'
import { GalleryBlock } from './gallery/block'
import { ComponentReferenceBlock } from './reference/block'
export const PreferencesRequests = ApplicationBlock.makeRequiredFieldBinding(PreferencesBlock, {
  field: 'preferences',
  init: { contextToArgs: ({ settings }) => [{ id: 'customize-desktop', settings }] },
})
export const MobilePreferencesRequests = ApplicationBlock.makeRequiredFieldBinding(
  PreferencesBlock,
  {
    field: 'mobilePreferences',
    init: {
      contextToArgs: ({ settings }) => [
        { id: 'customize-mobile', settings, parentId: 'navigation-dialog' },
      ],
    },
  },
)
export const FontPickerRequests = ApplicationBlock.makeRequiredFieldBinding(GoogleFontPickerBlock, {
  field: 'fontPicker',
  init: { contextToArgs: ({ settings }) => [settings] },
})
export const MaybeSystemBinding = ApplicationBlock.makeOptionalKeyedFieldBinding(SystemPagesBlock, {
  field: 'maybeSystem',
  key: 'key',
  childField: 'model',
  placement: 'maybeSystem',
})
export const MaybeLandingGalleryBinding = ApplicationBlock.makeOptionalFieldBinding(GalleryBlock, {
  field: 'maybeLandingGallery',
  placement: 'maybeLandingGallery',
})
export const MaybeReferenceGalleryBinding = ApplicationBlock.makeOptionalKeyedFieldBinding(
  GalleryBlock,
  {
    field: 'maybeReferenceGallery',
    key: 'key',
    childField: 'model',
    placement: 'maybeReferenceGallery',
  },
)
export const MaybeEmbeddedGalleryBinding = ApplicationBlock.makeOptionalKeyedFieldBinding(
  GalleryBlock,
  {
    field: 'maybeEmbeddedGallery',
    key: 'key',
    childField: 'model',
    placement: 'maybeEmbeddedGallery',
  },
)
export const MaybeReferenceBinding = ApplicationBlock.makeOptionalKeyedFieldBinding(
  ComponentReferenceBlock,
  {
    field: 'maybeReference',
    key: 'key',
    childField: 'model',
    placement: 'maybeReference',
    delivery: {
      toUpdateContext: (model) => [componentPresentation(model.settings, model.systemTheme)],
    },
  },
)

export const ReferenceQueryBinding = ApplicationBlock.makeRequiredFieldBinding(ReferenceQuery, {
  field: 'referenceQuery',
}).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(ReferenceQuery, {
    CompletedFetch: ({ args, result }) =>
      ApplicationBlock.makeStep((model) => {
        const page = pageAt(model.path)
        return Result.isSuccess(result) && page?.family === args.family && page.slug === args.slug
          ? MaybeReferenceBinding.informOfApiContracts(model.path, {
              indexes: result.success.contracts.flatMap((contract, index) =>
                contract.props.length ? [index] : [],
              ),
            })
          : { model }
      }),
  }),
})

export const Search = ApplicationBlock.makeRequiredFieldBinding(SearchBlock, {
  field: 'search',
  init: { contextToArgs: ({ settings, path }) => [settings, path] },
})
export const Navigation = ApplicationBlock.makeRequiredFieldBinding(NavigationBlock, {
  field: 'navigation',
  init: {
    contextToArgs: ({ settings, path }): [Settings, string, string, 'desktop'] => [
      settings,
      path,
      'desktop',
      'desktop',
    ],
  },
}).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(NavigationBlock, {
    RequestedSearch: () => Search.requestOpen(),
  }),
})
export const MobileMenu = ApplicationBlock.makeRequiredFieldBinding(NavigationBlock, {
  field: 'mobileMenu',
  init: {
    contextToArgs: ({ settings, path }): [Settings, string, string, 'mobile'] => [
      settings,
      path,
      'mobile',
      'mobile',
    ],
  },
}).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(NavigationBlock, {
    RequestedSearch: () => Search.requestOpen(),
  }),
})
