import type { Message } from './application-contract'
import { ApplicationBlock } from './application-contract'
import { CopyInstall, FinishCopyFeedback } from './application-commands'
import { beginCopy, setCopyFeedback, type CopySource } from './copy-feedback'
export const copyInstall = (source: CopySource) =>
  ApplicationBlock.makeStep((model) => {
    const copyFeedback = beginCopy(model.copyFeedback, source),
      revision = copyFeedback[source].revision
    return {
      model: { ...model, copyFeedback },
      commands: [CopyInstall({ path: model.path, settings: model.settings, revision, source })],
    }
  })
export const clickedCopyInstall = ApplicationBlock.makeStep.fromMessage(
  ({ source }: typeof Message.ClickedCopyInstall.Type) => copyInstall(source),
)
export const completedCopyInstall = ApplicationBlock.makeStep(
  (model, { revision, success, source }: typeof Message.CompletedCopyInstall.Type) =>
    revision !== model.copyFeedback[source].revision
      ? { model }
      : {
          model: {
            ...model,
            copyFeedback: setCopyFeedback(model.copyFeedback, source, revision, success),
            settingsAnnouncement: success
              ? 'Install prompt copied to clipboard'
              : 'Could not copy the install prompt',
          },
          commands: success ? [FinishCopyFeedback({ revision, source })] : [],
        },
)
export const completedCopyFeedback = ApplicationBlock.makeFieldsStep(
  (model, { revision, source }: typeof Message.CompletedCopyFeedback.Type) => ({
    copyFeedback: (state) => setCopyFeedback(state, source, revision, false),
  }),
)
