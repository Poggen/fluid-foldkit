import { Effect, Schema } from 'effect'
import { pageAt } from '../../lib/catalogue'
import { GalleryFlags, prepareGalleryFlags, prepareGalleryFlagsFor } from './gallery/flags'
import { initialProps } from './playground/catalogue'
import { previewOptionsFromUrl } from './playground/options'

export const PreparedGalleryBaseline = Schema.Struct({
  calendar: GalleryFlags.fields.calendar,
  calendarSelections: GalleryFlags.fields.calendarSelections,
  picker: GalleryFlags.fields.picker,
})
export type PreparedGalleryBaseline = typeof PreparedGalleryBaseline.Type

export const ApplicationFlags = Schema.Struct({
  baseline: PreparedGalleryBaseline,
  page: GalleryFlags,
})
export type ApplicationFlags = typeof ApplicationFlags.Type

export const prepareApplicationFlagsFor = (href: string) =>
  Effect.gen(function* () {
    const url = new URL(href)
    const page = pageAt(url.pathname)
    const preview =
      url.searchParams.get('embed') === '1' || page === undefined
        ? previewOptionsFromUrl(href)
        : initialProps(page)
    const pageFlags = yield* prepareGalleryFlagsFor(preview)
    const baseline = Object.keys(preview).length === 0 ? pageFlags : yield* prepareGalleryFlags
    return ApplicationFlags.make({ baseline, page: pageFlags })
  })
