import { Option } from 'effect'
import { ApplicationBlock, Message } from './application-contract'
import { Navigate } from './application-commands'

export const settledSettingsUrl = ApplicationBlock.makeStep(
  (model, { revision }: typeof Message.SettledSettingsUrl.Type) =>
    Option.match(model.pendingSettingsUrl, {
      onNone: () => ({ model }),
      onSome: (pending) =>
        pending.revision !== revision
          ? { model }
          : {
              model: { ...model, pendingSettingsUrl: Option.none() },
              commands: [Navigate({ href: pending.href, external: false, replace: true })],
            },
    }),
)
