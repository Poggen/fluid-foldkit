import type { SelectViewInputs } from './select.js'
import type { DropdownResources } from './dropdown-resources.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { layer as SelectLayer, SelectBlock } from './select.js'
import { SwitchLayer as ToggleLayer, SwitchBlock } from './switch.js'
import { layer as FieldLayer, InputFieldBlock } from './input-group-field.js'
import { layer as GroupLayer, InputGroupBlock } from './input-group.js'
import { Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import type { Html } from 'foldkit/html'
import { defineInMessageUnion } from 'foldkit/message'

import type { SwitchAnimation } from './switch-motion.js'

import { Button } from './button.js'
import type { MotionOptions } from './motion.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import {
  SettingsSection,
  members,
  settingsChoices,
  settingsSwitchRows,
} from './sidebar-settings-data.js'

export interface SettingsPanelConfig {
  readonly id: string
  readonly section: SettingsSection
  readonly parentDialogId?: string
}

export interface SettingsPanelViewInputs extends Presentation {
  readonly animate: (node: Html, options: MotionOptions) => Html
  readonly switchAnimate: (node: Html, options: SwitchAnimation) => Html
}

const Switch = SwitchBlock

const Field = InputFieldBlock

const InputGroup = InputGroupBlock

const Model = Schema.Struct({
  id: Schema.String,
  section: SettingsSection,
  first: SelectBlock.Model,
  second: SelectBlock.Model,
  third: SelectBlock.Model,
  digest: SwitchBlock.Model,
  mentions: SwitchBlock.Model,
  updates: SwitchBlock.Model,
  input: InputFieldBlock.Model,
  group: InputGroupBlock.Model,
})

const Select = SelectBlock

const Message = Schema.Never

const InMessage = defineInMessageUnion({ RequestedReset: { section: SettingsSection } })

const Config = Schema.Struct({
  id: Schema.String,
  section: SettingsSection,
  parentDialogId: Schema.optionalKey(Schema.String),
})

const effects = Block.makeEffectsContract<never, DropdownResources>()

export const SettingsPanelKey = Symbol('SettingsPanel')

export const SettingsPanelBlock = Block.make('SettingsPanel', {
  key: SettingsPanelKey,
  Model,
  Message,
  InMessage,
  InitArgs: Schema.Tuple([Config]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<SettingsPanelViewInputs>() },
  effects,
})

const FirstRaw = SettingsPanelBlock.makeRequiredFieldBinding(Select, {
  field: 'first',
  init: {
    contextToArgs: (config: SettingsPanelConfig) => [
      config.parentDialogId === undefined
        ? { id: `${config.id}-first`, ...settingsChoices(config.section, 0) }
        : {
            id: `${config.id}-first`,
            rootId: config.parentDialogId,
            parentId: config.parentDialogId,
            ...settingsChoices(config.section, 0),
          },
    ],
  },
})

const First = FirstRaw.withOutMessagePolicy({
  fold: SettingsPanelBlock.makeOutMessageFold(Select, {
    Selected: ({ value }) =>
      SettingsPanelBlock.makeStep(
        () => (model: Parameters<ReturnType<typeof FirstRaw.requestConfigure>>[0]) =>
          FirstRaw.requestConfigure({ items: model.first.items, value })(model),
      ),
    OpenChanged: SettingsPanelBlock.makeNoopStep,
  }),
})

const SecondRaw = SettingsPanelBlock.makeRequiredFieldBinding(Select, {
  field: 'second',
  init: {
    contextToArgs: (config: SettingsPanelConfig) => [
      config.parentDialogId === undefined
        ? { id: `${config.id}-second`, ...settingsChoices(config.section, 1) }
        : {
            id: `${config.id}-second`,
            rootId: config.parentDialogId,
            parentId: config.parentDialogId,
            ...settingsChoices(config.section, 1),
          },
    ],
  },
})

const Second = SecondRaw.withOutMessagePolicy({
  fold: SettingsPanelBlock.makeOutMessageFold(Select, {
    Selected: ({ value }) =>
      SettingsPanelBlock.makeStep(
        () => (model: Parameters<ReturnType<typeof SecondRaw.requestConfigure>>[0]) =>
          SecondRaw.requestConfigure({ items: model.second.items, value })(model),
      ),
    OpenChanged: SettingsPanelBlock.makeNoopStep,
  }),
})

const ThirdRaw = SettingsPanelBlock.makeRequiredFieldBinding(Select, {
  field: 'third',
  init: {
    contextToArgs: (config: SettingsPanelConfig) => [
      config.parentDialogId === undefined
        ? { id: `${config.id}-third`, ...settingsChoices(config.section, 2) }
        : {
            id: `${config.id}-third`,
            rootId: config.parentDialogId,
            parentId: config.parentDialogId,
            ...settingsChoices(config.section, 2),
          },
    ],
  },
})

const Third = ThirdRaw.withOutMessagePolicy({
  fold: SettingsPanelBlock.makeOutMessageFold(Select, {
    Selected: ({ value }) =>
      SettingsPanelBlock.makeStep(
        () => (model: Parameters<ReturnType<typeof ThirdRaw.requestConfigure>>[0]) =>
          ThirdRaw.requestConfigure({ items: model.third.items, value })(model),
      ),
    OpenChanged: SettingsPanelBlock.makeNoopStep,
  }),
})

const DigestRaw = SettingsPanelBlock.makeRequiredFieldBinding(Switch, {
  field: 'digest',
  init: {
    contextToArgs: (config: SettingsPanelConfig) => [{ id: `${config.id}-digest`, checked: true }],
  },
})

const Digest = DigestRaw.withOutMessagePolicy({
  fold: SettingsPanelBlock.makeOutMessageFold(Switch, {
    Toggled: () =>
      SettingsPanelBlock.makeStep(
        () => (model: Parameters<ReturnType<typeof DigestRaw.requestConfigure>>[0]) =>
          DigestRaw.requestConfigure({ checked: !model.digest.checked, disabled: false })(model),
      ),
  }),
})

const MentionsRaw = SettingsPanelBlock.makeRequiredFieldBinding(Switch, {
  field: 'mentions',
  init: {
    contextToArgs: (config: SettingsPanelConfig) => [
      { id: `${config.id}-mentions`, checked: true },
    ],
  },
})

const Mentions = MentionsRaw.withOutMessagePolicy({
  fold: SettingsPanelBlock.makeOutMessageFold(Switch, {
    Toggled: () =>
      SettingsPanelBlock.makeStep(
        () => (model: Parameters<ReturnType<typeof MentionsRaw.requestConfigure>>[0]) =>
          MentionsRaw.requestConfigure({ checked: !model.mentions.checked, disabled: false })(
            model,
          ),
      ),
  }),
})

const UpdatesRaw = SettingsPanelBlock.makeRequiredFieldBinding(Switch, {
  field: 'updates',
  init: {
    contextToArgs: (config: SettingsPanelConfig) => [
      { id: `${config.id}-updates`, checked: false },
    ],
  },
})

const Updates = UpdatesRaw.withOutMessagePolicy({
  fold: SettingsPanelBlock.makeOutMessageFold(Switch, {
    Toggled: () =>
      SettingsPanelBlock.makeStep(
        () => (model: Parameters<ReturnType<typeof UpdatesRaw.requestConfigure>>[0]) =>
          UpdatesRaw.requestConfigure({ checked: !model.updates.checked, disabled: false })(model),
      ),
  }),
})

const InputRaw = SettingsPanelBlock.makeRequiredFieldBinding(Field, {
  field: 'input',
  init: {
    contextToArgs: (config: SettingsPanelConfig) => [
      { id: `${config.id}-name`, index: 0, value: 'Acme Inc' },
    ],
  },
})

const Input = InputRaw.withOutMessagePolicy({
  fold: SettingsPanelBlock.makeOutMessageFold(Field, {
    Changed: ({ value }) => InputRaw.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

const Group = SettingsPanelBlock.makeRequiredFieldBinding(InputGroup, {
  field: 'group',
  init: { contextToArgs: (config: SettingsPanelConfig) => [{ id: `${config.id}-group` }] },
})

const SettingsPanelComposition = SettingsPanelBlock.makeComposition({
  bindings: [First, Second, Third, Digest, Mentions, Updates, Input, Group],
})

const init = SettingsPanelComposition.makeInit((config: SettingsPanelConfig) => ({
  childInitContext: config,
  model: { id: config.id, section: config.section },
}))

const inMessageUpdate = SettingsPanelComposition.makeInMessageUpdate({
  RequestedReset: SettingsPanelBlock.makeStep.fromMessage(({ section }) =>
    Update.combineSteps([
      SettingsPanelBlock.makeFieldsStep(() => ({ section: () => section })),
      First.requestConfigure(settingsChoices(section, 0)),
      Second.requestConfigure(settingsChoices(section, 1)),
      Third.requestConfigure(settingsChoices(section, 2)),
      Digest.requestConfigure({ checked: true, disabled: false }),
      Mentions.requestConfigure({ checked: true, disabled: false }),
      Updates.requestConfigure({ checked: false, disabled: false }),
      Input.requestConfigure({ value: 'Acme Inc', disabled: false, readOnly: false }),
    ]),
  ),
})

const update = SettingsPanelComposition.makeUpdate({})

const view = SettingsPanelComposition.makeView.withInputs<SettingsPanelViewInputs>(
  (model, inputs, h) => {
    const { icons } = resolvePresentation(inputs)

    const row = (label: string, description: string, control: Html) =>
      h.div(
        [
          h.Class(
            'flex items-center justify-between gap-6 border-b border-border/60 py-4 last:border-b-0',
          ),
        ],
        [
          h.div(
            [h.Class('flex min-w-0 flex-col gap-0.5')],
            [
              h.span(
                [
                  h.Class(
                    'text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)] text-foreground',
                  ),
                ],
                [label],
              ),
              h.span(
                [
                  h.Class(
                    'text-[length:var(--fs-caption,12px)] leading-[var(--lh-caption,16px)] text-muted-foreground',
                  ),
                ],
                [description],
              ),
            ],
          ),
          h.div([h.Class('shrink-0')], [control]),
        ],
      )

    const themeIcon: NonNullable<SelectViewInputs['itemIconFor']> = (item) => {
      if (item.value === 'light') {
        return icons.sun
      }

      if (item.value === 'dark') {
        return icons.moon
      }

      return icons.monitor
    }

    const select = (index: number, label: string) => {
      const binding = [First, Second, Third][index] ?? Third
      const state = [model.first, model.second, model.third][index] ?? model.third

      const base: SelectViewInputs = {
        ...inputs,
        ariaLabel: label,
        variant: model.section === 'members' ? 'borderless' : 'bordered',
      }

      const viewInputs =
        model.section === 'appearance' && index === 0 ? { ...base, itemIconFor: themeIcon } : base

      return h.block(binding.embedView({ slotId: `choice-${index}`, model: state, viewInputs }))
    }

    if (model.section === 'general') {
      return h.div(
        [h.Class('flex flex-col gap-6')],
        [
          h.block(
            Group.embedView({
              slotId: 'group',
              model: model.group,
              viewInputs: {
                ...inputs,
                className: 'w-full',
                content: ({ activeIndex, context }) => [
                  h.block(
                    Input.embedView({
                      slotId: 'input',
                      model: model.input,
                      viewInputs: {
                        context,
                        label: 'Workspace name',
                        placeholder: 'Acme Inc',
                        activeIndex,
                      },
                    }),
                  ),
                ],
              },
            }),
          ),
          h.div(
            [h.Class('flex flex-col')],
            [
              row('Language', 'Used for the interface and emails.', select(0, 'Language')),
              row('Timezone', 'Dates and reminders follow it.', select(1, 'Timezone')),
            ],
          ),
        ],
      )
    }

    if (model.section === 'appearance') {
      return h.div(
        [h.Class('flex flex-col')],
        [
          row('Theme', 'Follows the system unless you pick one.', select(0, 'Theme')),
          row('Density', 'Row height across lists and tables.', select(1, 'Density')),
        ],
      )
    }

    if (model.section === 'members') {
      return h.div(
        [h.Class('flex flex-col')],
        [
          ...members.map((member, index) =>
            row(member.name, member.email, select(index, `${member.name} role`)),
          ),
          h.div(
            [h.Class('pt-4')],
            [
              Button(
                { ...inputs, variant: 'secondary', buttonSize: 'sm', children: ['Invite people'] },
                h,
              ),
            ],
          ),
        ],
      )
    }

    return h.div(
      [h.Class('flex flex-col')],
      [
        ...settingsSwitchRows(model.section).map((item, index) => {
          const binding = [Digest, Mentions, Updates][index] ?? Updates
          const state = [model.digest, model.mentions, model.updates][index] ?? model.updates

          return row(
            item.label,
            item.description,
            h.block(
              binding.embedView({
                slotId: `toggle-${index}`,
                model: state,
                viewInputs: {
                  ...inputs,
                  animate: inputs.switchAnimate,
                  label: item.label,
                  className: '[&>span:last-child]:sr-only',
                },
              }),
            ),
          )
        }),
        ...(model.section === 'security'
          ? [
              row(
                'Active sessions',
                '3 devices are signed in right now.',
                Button(
                  {
                    ...inputs,
                    variant: 'secondary',
                    buttonSize: 'sm',
                    children: ['Sign out everywhere'],
                  },
                  h,
                ),
              ),
            ]
          : []),
      ],
    )
  },
)

export const SettingsPanelLayer = SettingsPanelBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
}).pipe(Layer.provide(Layer.mergeAll(SelectLayer, ToggleLayer, FieldLayer, GroupLayer)))

export const test = { Input, Digest }
