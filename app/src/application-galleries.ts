import { Option } from 'effect'
import { Update } from 'foldkit'
import { ApplicationBlock } from './application-contract'
import { MaybeReferenceGalleryBinding, MaybeReferenceBinding } from './application-bindings'
import { componentPresentation } from './settings'
import {
  acceptConfiguration,
  editedConfigurationFields,
  needsChildReconciliation,
} from './playground/configuration-acceptance'
import type { ComponentReferenceBlock } from './reference/block'

type Model = typeof ApplicationBlock.Model.Type
type PreviewRequest = typeof ComponentReferenceBlock.OutMessage.RequestedPreviewConfiguration.Type

export const configureReferencePreview = (request: PreviewRequest) =>
  ApplicationBlock.makeStep((model) =>
    Option.isNone(model.maybeReference) || model.maybeReference.value.key !== request.path
      ? { model }
      : MaybeReferenceGalleryBinding.informOfConfiguration(request.path, {
          configuration: request.configuration,
          presentation:
            request.presentation ?? componentPresentation(model.settings, model.systemTheme),
          ...(request.edited === undefined ? {} : { edited: request.edited }),
          ...(request.intent === undefined ? {} : { intent: request.intent }),
        }),
  )

const unchanged = ApplicationBlock.makeNoopStep()

export const acceptReferencePreview = (model: Model, before: Model) => {
  const previousReference = Option.getOrUndefined(before.maybeReference)
  const reference = Option.getOrUndefined(model.maybeReference)
  const previous = Option.getOrUndefined(before.maybeReferenceGallery)
  const current = Option.getOrUndefined(model.maybeReferenceGallery)
  if (
    previousReference === undefined ||
    reference === undefined ||
    previous === undefined ||
    current === undefined ||
    previousReference.key !== reference.key ||
    previous.key !== reference.key ||
    current.key !== reference.key
  )
    return unchanged
  const configurationBefore = previousReference.model.configuration
  const configurationNow = reference.model.configuration
  const presentation = componentPresentation(model.settings, model.systemTheme)
  if (configurationBefore !== configurationNow && previous.model === current.model)
    return MaybeReferenceGalleryBinding.informOfConfiguration(reference.key, {
      configuration: configurationNow,
      presentation,
      edited: editedConfigurationFields(configurationBefore, configurationNow),
      intent: 'edit',
    })
  if (previous.model === current.model || configurationBefore !== configurationNow) return unchanged
  const configuration = acceptConfiguration(
    configurationNow,
    previous.model.fluid,
    current.model.fluid,
  )
  const reconcile = needsChildReconciliation(
    configuration,
    previous.model.fluid,
    current.model.fluid,
  )
  if (configuration === configurationNow && !reconcile) return unchanged
  return Update.combineSteps([
    MaybeReferenceBinding.informOfAcceptedConfiguration(reference.key, {
      path: reference.key,
      configuration,
    }),
    MaybeReferenceGalleryBinding.informOfConfiguration(reference.key, {
      configuration,
      presentation,
      edited: editedConfigurationFields(configurationNow, configuration),
      intent: configuration === configurationNow ? 'reconcile' : 'edit',
    }),
  ])
}

export const embeddedConfiguration = (model: Model) =>
  Option.flatMap(model.maybeEmbeddedGallery, ({ model: gallery }) => gallery.embeddedConfiguration)
