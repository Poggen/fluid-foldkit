import { ApplicationBlock, Message } from './application-contract'
import { Apply } from './application-commands'
import type { Settings } from './settings'
import { PrepareFont, WaitForFont } from './fonts/commands'
export const requestFont = (settings: Settings) =>
  ApplicationBlock.makeStep((model) => {
    const revision = model.fontRevision + 1
    return settings.font === 'custom' && settings.customFont !== undefined
      ? {
          model: { ...model, fontRevision: revision, fontAsset: { _tag: 'Preparing', revision } },
          commands: [PrepareFont({ revision, choice: settings.customFont })],
        }
      : { model: { ...model, fontRevision: revision, fontAsset: { _tag: 'Idle' } } }
  })
export const timedOutFont = ApplicationBlock.makeStep(
  (model, { revision }: typeof Message.TimedOutFont.Type) =>
    revision === model.fontRevision &&
    model.fontAsset._tag !== 'Ready' &&
    model.fontAsset._tag !== 'Idle' &&
    model.fontAsset._tag !== 'Failed'
      ? {
          model: {
            ...model,
            fontAsset: {
              _tag: 'Failed',
              revision,
              message: 'The font request timed out. Using Inter until you retry.',
            },
          },
          commands: [Apply({ settings: model.settings, fontFailed: true })],
        }
      : { model },
)

export const loadedFontStylesheet = ApplicationBlock.makeStep(
  (model, { revision }: typeof Message.LoadedFontStylesheet.Type) =>
    revision !== model.fontRevision ||
    model.fontAsset._tag !== 'Stylesheet' ||
    model.settings.customFont === undefined
      ? { model }
      : {
          model: { ...model, fontAsset: { ...model.fontAsset, _tag: 'Loading' } },
          commands: [WaitForFont({ revision, choice: model.settings.customFont })],
        },
)

export const failedFontStylesheet = ApplicationBlock.makeStep(
  (model, { revision }: typeof Message.FailedFontStylesheet.Type) =>
    revision === model.fontRevision
      ? {
          model: {
            ...model,
            fontAsset: {
              _tag: 'Failed',
              revision,
              message: 'The Google Fonts stylesheet could not load. Using Inter until you retry.',
            },
          },
          commands: [Apply({ settings: model.settings, fontFailed: true })],
        }
      : { model },
)

export const completedFontLoad = ApplicationBlock.makeStep(
  (model, { revision, success }: typeof Message.CompletedFontLoad.Type) => {
    const asset = model.fontAsset
    return revision === model.fontRevision && asset._tag === 'Loading'
      ? {
          model: {
            ...model,
            fontAsset: success
              ? { ...asset, _tag: 'Ready' }
              : {
                  _tag: 'Failed',
                  revision,
                  message: 'The font could not load. Using Inter until you retry.',
                },
          },
          commands: [Apply({ settings: model.settings, fontFailed: !success })],
        }
      : { model }
  },
)
