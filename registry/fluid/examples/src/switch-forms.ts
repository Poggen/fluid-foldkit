import { Button } from '@foldkit/ui'
import { Boolean, Number } from 'effect'
import { examplePresentation } from './example-presentation.js'
import { Layer, Schema } from 'effect'
import { Block, Program, Runtime } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import {
  KeyboardNavGateBlock,
  KeyboardNavGateLayer,
} from '@foldkit-visuals/fluid/keyboard-nav-gate'
import { SwitchBlock, SwitchLayer, createSwitchMotionScope } from '@foldkit-visuals/fluid/switch'
import {} from './switch-forms.css'

const Model = Schema.Struct({
  switch: SwitchBlock.Model,
  gate: KeyboardNavGateBlock.Model,
  isCompact: Schema.Boolean,
  isMounted: Schema.Boolean,
  submissions: Schema.Natural,
})

const Message = defineMessageUnion({
  ClickedToggle: {},
  ClickedDisable: {},
  ClickedSize: {},
  ClickedOpen: {},
  ClickedClose: {},
  ClickedMount: {},
  Submitted: {},
})

export const FluidSwitchFormsKey = Symbol('FluidSwitchForms')

const FluidSwitchFormsBlock = Block.make('FluidSwitchForms', {
  key: FluidSwitchFormsKey,
  Model,
  Message,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Document' },
})

const Toggle = FluidSwitchFormsBlock.makeRequiredFieldBinding(SwitchBlock, {
  field: 'switch',
  init: { contextToArgs: () => [{ id: 'notifications', checked: false }] },
})

const Switch = Toggle.withOutMessagePolicy({
  fold: FluidSwitchFormsBlock.makeOutMessageFold(SwitchBlock, {
    Toggled: () =>
      FluidSwitchFormsBlock.makeStep((model) =>
        Toggle.requestConfigure({
          checked: !model.switch.checked,
          disabled: model.switch.disabled,
        }),
      ),
  }),
})

const Gate = FluidSwitchFormsBlock.makeRequiredFieldBinding(KeyboardNavGateBlock, {
  field: 'gate',
  init: { contextToArgs: () => [{ id: 'navigation-gate' }] },
})

const FluidSwitchFormsComposition = FluidSwitchFormsBlock.makeComposition({
  bindings: [Switch, Gate],
})

const init = FluidSwitchFormsComposition.makeInit(() => ({
  model: { isCompact: false, isMounted: true, submissions: 0 },
}))

const update = FluidSwitchFormsComposition.makeUpdate({
  Submitted: FluidSwitchFormsBlock.makeFieldsStep(() => ({
    submissions: Number.increment,
  })),
  ClickedToggle: Switch.requestToggle(),
  ClickedDisable: FluidSwitchFormsBlock.makeStep((model) =>
    Switch.requestConfigure({ checked: model.switch.checked, disabled: !model.switch.disabled }),
  ),
  ClickedSize: FluidSwitchFormsBlock.makeFieldsStep(() => ({ isCompact: Boolean.not })),
  ClickedOpen: Gate.requestOpen({ open: true }),
  ClickedClose: Gate.requestOpen({ open: false }),
  ClickedMount: FluidSwitchFormsBlock.makeFieldsStep(() => ({ isMounted: Boolean.not })),
})

const motion = createSwitchMotionScope('switch-forms')

const view = FluidSwitchFormsComposition.makeView((model, h) => ({
  title: 'Fluid Switch forms',
  body: h.main(
    [h.Class('p-6')],
    [
      h.div(
        [
          h.Class(
            'flex gap-2 mb-4 [&_button]:p-[4px_8px] [&_button]:[border:1px_solid_var(--border)]',
          ),
        ],
        [
          Button.view(
            {
              onClick: Message.ClickedToggle(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('set-checked')], ['Toggle']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedDisable(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('set-disabled')], ['Disable']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedSize(),
              toView: (attributes) => h.button([...attributes.button, h.Id('set-size')], ['Size']),
            },
            h,
          ),
          Button.view(
            {
              onClick: Message.ClickedMount(),
              toView: (attributes) =>
                h.button([...attributes.button, h.Id('set-mount')], ['Mount']),
            },
            h,
          ),
        ],
      ),
      h.form(
        [h.Class('w-80'), h.Id('switch-fixture'), h.OnSubmit(Message.Submitted())],
        [
          model.isMounted
            ? h.block(
                Switch.embedView({
                  slotId: model.switch.id,
                  model: model.switch,
                  viewInputs: {
                    label: 'Notifications',
                    size: model.isCompact ? 'compact' : 'default',
                    animate: motion.node,
                    ...examplePresentation,
                  },
                }),
              )
            : null,
        ],
      ),
      h.output([h.Id('switch-checked')], [String(model.switch.checked)]),
      h.output([h.Id('form-submissions')], [String(model.submissions)]),
      Button.view(
        {
          type: 'submit',
          toView: (attributes) =>
            h.button(
              [...attributes.button, h.Id('submit-form'), h.FormAttr('switch-fixture')],
              ['Submit form'],
            ),
        },
        h,
      ),
      Button.view(
        {
          type: 'reset',
          toView: (attributes) =>
            h.button(
              [...attributes.button, h.Id('reset-form'), h.FormAttr('switch-fixture')],
              ['Reset form'],
            ),
        },
        h,
      ),
      Button.view(
        {
          onClick: Message.ClickedOpen(),
          toView: (attributes) =>
            h.button([...attributes.button, h.Id('open-gate')], ['Open navigation gate']),
        },
        h,
      ),
      Button.view(
        {
          onClick: Message.ClickedClose(),
          toView: (attributes) =>
            h.button([...attributes.button, h.Id('close-gate')], ['Close navigation gate']),
        },
        h,
      ),
      h.block(
        Gate.embedView({
          slotId: model.gate.id,
          model: model.gate,
          viewInputs: {
            content: ({ keyboardNav }) => [
              Button.view(
                {
                  toView: (attributes) =>
                    h.button(
                      [
                        ...attributes.button,
                        h.Id('gate-row'),
                        h.Class(keyboardNav ? '[outline:1px_solid_#6b97ff]' : ''),
                      ],
                      ['Focusable row'],
                    ),
                },
                h,
              ),
              h.output([h.Id('gate-earned')], [String(keyboardNav)]),
            ],
            ...examplePresentation,
          },
        }),
      ),
    ],
  ),
}))

const layer = FluidSwitchFormsBlock.makeLayer({ init, update, view }).pipe(
  Layer.provide(Layer.mergeAll(SwitchLayer, KeyboardNavGateLayer, motion.layer)),
)

Runtime.run(
  Program.make({
    block: FluidSwitchFormsBlock,
    layer,
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
