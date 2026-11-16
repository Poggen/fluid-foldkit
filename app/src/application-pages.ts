import { ReferenceQuery, referenceContractIndexes } from './reference/query'
import { Option } from 'effect'
import { Update } from 'foldkit'
import { initAndSet } from 'foldkit/binding'
import { ApplicationBlock } from './application-contract'
import {
  MaybeLandingGalleryBinding,
  MaybeReferenceBinding,
  ReferenceQueryBinding,
  MaybeReferenceGalleryBinding,
  MaybeSystemBinding,
  MaybeEmbeddedGalleryBinding,
} from './application-bindings'
import { pageAt } from '../../lib/catalogue'
import type { GalleryFlags } from './gallery/flags'
import { systemAt } from '../../lib/system'
import type { PreviewOptions } from './playground/options'
import { legacyOptions } from './playground/configuration'
import { configurationForEmbeddedPage } from './gallery/block'
import { componentPresentation, type ComponentPresentation } from './settings'

export const informPagePresentation = (presentation: ComponentPresentation) =>
  ApplicationBlock.makeStep((model) =>
    Update.combineSteps([
      ...(model.path === '/'
        ? [MaybeLandingGalleryBinding.informOfPresentation({ presentation })]
        : []),
      MaybeReferenceBinding.informOfPresentation(model.path, { presentation }),
      MaybeSystemBinding.informOfPresentation(model.path, { presentation }),
      MaybeEmbeddedGalleryBinding.informOfPresentation(model.path, { presentation }),
    ]),
  )

export const informPageViewport = (columns: 1 | 2 | 3) =>
  ApplicationBlock.makeStep((model) =>
    Update.combineSteps([
      MaybeLandingGalleryBinding.informOfViewport({ columns }),
      MaybeEmbeddedGalleryBinding.informOfViewport(model.path, { columns }),
    ]),
  )

// Accepted route identity owns page Models, even when A→B→A rendering batches away B.
// Physical Mount resources remain scoped to their rendered elements.
export const reconcilePageVisit = (options: PreviewOptions, initial?: GalleryFlags) =>
  ApplicationBlock.makeStep((model) => {
    const { path, isEmbed } = model
    const page = pageAt(path)
    const landing = path === '/'
    const reference = !isEmbed && page !== undefined
    const system = !isEmbed && systemAt(path) !== undefined
    const embedded = isEmbed && page !== undefined
    const presentation = componentPresentation(model.settings, model.systemTheme)
    const flags = { ...(initial ?? model.initialGalleryFlags), preview: options }
    return Update.combineSteps([
      ...ReferenceQuery.pendingArgs(model.referenceQuery)
        .filter((args) => !reference || args.family !== page?.family || args.slug !== page.slug)
        .map((args) => ReferenceQueryBinding.requestCancel(args)),
      ApplicationBlock.makeFieldsStep((current) => ({
        chartStylesActive: () => current.chartStylesActive || page?.family === 'charts',
        ...(!landing && Option.isSome(current.maybeLandingGallery)
          ? { maybeLandingGallery: () => Option.none() }
          : {}),
        ...(!reference && Option.isSome(current.maybeReference)
          ? { maybeReference: () => Option.none() }
          : {}),
        ...(!reference && Option.isSome(current.maybeReferenceGallery)
          ? { maybeReferenceGallery: () => Option.none() }
          : {}),
        ...(!system && Option.isSome(current.maybeSystem)
          ? { maybeSystem: () => Option.none() }
          : {}),
        ...(!embedded && Option.isSome(current.maybeEmbeddedGallery)
          ? { maybeEmbeddedGallery: () => Option.none() }
          : {}),
      })),
      ApplicationBlock.makeStep((current) => {
        if (!landing || Option.isSome(current.maybeLandingGallery)) return { model: current }
        return Update.combineSteps([
          ApplicationBlock.makeStep((parent) =>
            initAndSet(MaybeLandingGalleryBinding, parent, { args: [flags] }),
          ),
          MaybeLandingGalleryBinding.informOfPresentation({ presentation }),
          ...(current.columns === null
            ? []
            : [MaybeLandingGalleryBinding.informOfViewport({ columns: current.columns })]),
        ])
      }),
      ApplicationBlock.makeStep((current) => {
        if (!reference) return { model: current }
        if (Option.isSome(current.maybeReference) && current.maybeReference.value.key === path)
          return MaybeReferenceBinding.informOfLocation(path, { options, presentation })
        return Update.combineSteps([
          ReferenceQueryBinding.requestLoadIfMissing({ family: page.family, slug: page.slug }),
          ApplicationBlock.makeStep((parent) =>
            initAndSet(MaybeReferenceBinding, parent, {
              key: path,
              args: [path, flags, presentation],
            }),
          ),
          ApplicationBlock.makeStep((parent) =>
            MaybeReferenceBinding.informOfApiContracts(path, {
              indexes: referenceContractIndexes(parent.referenceQuery, path),
            }),
          ),
          ApplicationBlock.makeStep((parent) => {
            const initialized = Option.getOrThrow(parent.maybeReference)
            return initAndSet(MaybeReferenceGalleryBinding, parent, {
              key: path,
              args: [{ ...flags, preview: legacyOptions(initialized.model.configuration) }],
            })
          }),
          ApplicationBlock.makeStep((parent) => {
            const initialized = Option.getOrThrow(parent.maybeReference)
            return MaybeReferenceGalleryBinding.informOfConfiguration(path, {
              configuration: initialized.model.configuration,
              presentation,
              intent: 'initialize',
            })
          }),
        ])
      }),
      ApplicationBlock.makeStep((current) => {
        if (
          !system ||
          (Option.isSome(current.maybeSystem) && current.maybeSystem.value.key === path)
        )
          return { model: current }
        return initAndSet(MaybeSystemBinding, current, { key: path, args: [path, presentation] })
      }),
      ApplicationBlock.makeStep((current) => {
        if (!embedded || page === undefined) return { model: current }
        const configuration = configurationForEmbeddedPage(page, options)
        if (
          Option.isSome(current.maybeEmbeddedGallery) &&
          current.maybeEmbeddedGallery.value.key === path
        )
          return MaybeEmbeddedGalleryBinding.informOfConfiguration(path, {
            configuration,
            presentation,
            source: 'location',
          })
        return Update.combineSteps([
          ApplicationBlock.makeStep((parent) =>
            initAndSet(MaybeEmbeddedGalleryBinding, parent, {
              key: path,
              args: [
                { ...flags, ...(page?.family === 'fluid' ? { componentSlug: page.slug } : {}) },
              ],
            }),
          ),
          MaybeEmbeddedGalleryBinding.informOfConfiguration(path, {
            configuration,
            presentation,
            source: 'location',
          }),
          ...(current.columns === null
            ? []
            : [MaybeEmbeddedGalleryBinding.informOfViewport(path, { columns: current.columns })]),
        ])
      }),
    ])
  })
