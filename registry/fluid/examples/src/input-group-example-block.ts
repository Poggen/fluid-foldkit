import { hoverModeOf as inputgroupHoverModeOf } from '@foldkit-visuals/fluid/input-group'
import {
  hoverModeOf as controlsHoverModeOf,
  PreviewControlsBlock,
  layer as PreviewControlsLayer,
} from '../../../../components/docs/preview-controls'
import {
  previewCodeTabId,
  previewCodeTabsViewInputs,
} from '../../../../components/docs/preview-code-tabs.js'
import { initAndInsert } from 'foldkit/binding'

import { createTargetMotionScope } from '@foldkit-visuals/fluid/motion/target'
import {
  documentationFields,
  documentationInMessages,
  documentationDefaults,
} from './documentation.js'
import { defineInMessageUnion } from 'foldkit/message'
import { docSection } from './doc-section.js'
import source from './input-group-example-block.ts?raw'
import { exampleHoverConfig } from './example-presentation.js'
import { Effect, Layer, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { InputGroupBlock, layer as InputGroupLayer } from '@foldkit-visuals/fluid/input-group'
import { InputFieldBlock, layer as InputFieldLayer } from '@foldkit-visuals/fluid/input-field'
import { defaultIcons } from '@foldkit-visuals/fluid/icons'

const Model = Schema.Struct({
  ...documentationFields,
  docTabs: Schema.Record(Schema.String, PreviewControlsBlock.Model),
  basic: InputGroupBlock.Model,
  multiple: InputGroupBlock.Model,
  error: InputGroupBlock.Model,
  search: InputFieldBlock.Model,
  name: InputFieldBlock.Model,
  email: InputFieldBlock.Model,
  errorEmail: InputFieldBlock.Model,
})

export const InputGroupExampleKey = Symbol('InputGroupExample')

const effects = Block.makeEffectsContract()

export const InputGroupExampleBlock = Block.make('InputGroupExample', {
  key: InputGroupExampleKey,
  Model,
  Message: Schema.Never,
  InMessage: defineInMessageUnion(documentationInMessages),
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects,
})

const Basic = InputGroupExampleBlock.makeRequiredFieldBinding(InputGroupBlock, {
  field: 'basic',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'basic-input-group' }] },
})

const Multiple = InputGroupExampleBlock.makeRequiredFieldBinding(InputGroupBlock, {
  field: 'multiple',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'multiple-input-group' }] },
})

const ErrorGroup = InputGroupExampleBlock.makeRequiredFieldBinding(InputGroupBlock, {
  field: 'error',
  init: { contextToArgs: () => [{ ...exampleHoverConfig, id: 'error-input-group' }] },
})

const SearchInput = InputGroupExampleBlock.makeRequiredFieldBinding(InputFieldBlock, {
  field: 'search',
  init: { contextToArgs: () => [{ id: 'search', index: 0, value: '' }] },
})

const Search = SearchInput.withOutMessagePolicy({
  fold: InputGroupExampleBlock.makeOutMessageFold(InputFieldBlock, {
    Changed: ({ value }) =>
      SearchInput.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

const NameInput = InputGroupExampleBlock.makeRequiredFieldBinding(InputFieldBlock, {
  field: 'name',
  init: { contextToArgs: () => [{ id: 'name', index: 0, value: '' }] },
})

const Name = NameInput.withOutMessagePolicy({
  fold: InputGroupExampleBlock.makeOutMessageFold(InputFieldBlock, {
    Changed: ({ value }) => NameInput.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

const EmailInput = InputGroupExampleBlock.makeRequiredFieldBinding(InputFieldBlock, {
  field: 'email',
  init: { contextToArgs: () => [{ id: 'email', index: 1, value: '' }] },
})

const Email = EmailInput.withOutMessagePolicy({
  fold: InputGroupExampleBlock.makeOutMessageFold(InputFieldBlock, {
    Changed: ({ value }) =>
      EmailInput.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

const ErrorEmailInput = InputGroupExampleBlock.makeRequiredFieldBinding(InputFieldBlock, {
  field: 'errorEmail',
  init: { contextToArgs: () => [{ id: 'error-email', index: 0, value: 'bad@' }] },
})

const ErrorEmail = ErrorEmailInput.withOutMessagePolicy({
  fold: InputGroupExampleBlock.makeOutMessageFold(InputFieldBlock, {
    Changed: ({ value }) =>
      ErrorEmailInput.requestConfigure({ value, disabled: false, readOnly: false }),
  }),
})

const DocTabs = InputGroupExampleBlock.makeRecordBinding(PreviewControlsBlock, { field: 'docTabs' })
const docSections = ['Basic', 'Multiple Fields', 'Error State']

const InputGroupExampleComposition = InputGroupExampleBlock.makeComposition({
  bindings: [Basic, Multiple, ErrorGroup, Search, Name, Email, ErrorEmail, DocTabs],
})

const init = InputGroupExampleComposition.makeInit(() => ({
  model: { ...documentationDefaults, docTabs: {} },
  steps: docSections.map((title) =>
    InputGroupExampleBlock.makeStep((model) =>
      initAndInsert(DocTabs, model, {
        key: title,
        args: [
          {
            id: previewCodeTabId('input-group', title),
            idPrefix: previewCodeTabId('input-group', title),
            selectedIndex: 0,
          },
        ],
      }),
    ),
  ),
}))

const update = InputGroupExampleComposition.makeUpdate({})
const inMessageUpdate = InputGroupExampleComposition.makeInMessageUpdate({
  InformedOfDocumentation: InputGroupExampleBlock.makeStep(
    (model, { embedded, shape, size, hoverMode }) =>
      Update.combineSteps([
        InputGroupExampleBlock.makeFieldsStep(() => ({
          isDocEmbedded: () => embedded,
          docShape: () => shape,
          docSize: () => size,
          docHover: () => hoverMode,
        })),
        ...Object.entries(model.docTabs).flatMap(([key, child]) =>
          controlsHoverModeOf(child) === hoverMode
            ? []
            : [DocTabs.requestHoverMode(key, { mode: hoverMode })],
        ),

        InputGroupExampleBlock.makeStep((current) =>
          inputgroupHoverModeOf(current.basic) === hoverMode
            ? { model: current }
            : Basic.requestHoverMode({ mode: hoverMode }),
        ),
        InputGroupExampleBlock.makeStep((current) =>
          inputgroupHoverModeOf(current.multiple) === hoverMode
            ? { model: current }
            : Multiple.requestHoverMode({ mode: hoverMode }),
        ),
        InputGroupExampleBlock.makeStep((current) =>
          inputgroupHoverModeOf(current.error) === hoverMode
            ? { model: current }
            : ErrorGroup.requestHoverMode({ mode: hoverMode }),
        ),
      ]),
  ),
})

export const InputGroupExampleLayer = Layer.unwrap(
  Effect.sync(() => {
    const tabsMotion = createTargetMotionScope('input-group-docs-tabs')

    const view = InputGroupExampleComposition.makeView((model, h) => {
      const appearance = { shape: model.docShape, size: model.docSize, hoverMode: model.docHover }
      const section = (title: string, content: ReturnType<typeof h.div>) =>
        docSection(h, {
          title,
          children: [content],
          source,
          presentation: appearance,
          className: 'w-full max-w-sm',
          pane: model.docTabs[title]?.tabs.selectedIndex === 1 ? 'code' : 'preview',
          tabsId: previewCodeTabId('input-group', title),
          tabs: (() => {
            const child = model.docTabs[title]
            return child === undefined
              ? h.empty
              : h.block(
                  DocTabs.embedView({
                    key: title,
                    slotId: child.tabs.id,
                    model: child,
                    viewInputs: previewCodeTabsViewInputs(h, {
                      ...appearance,
                      animate: tabsMotion.node,
                      ariaLabel: `${title} view`,
                    }),
                  }),
                )
          })(),
        })
      const search = h.block(
        Search.embedView({
          slotId: 'search',
          model: model.search,
          viewInputs: {
            label: 'Search',
            placeholder: 'Search teamspaces...',
            icon: defaultIcons.search,
            activeIndex: model.basic.hover.activeIndex,
            ...appearance,
          },
        }),
      )

      const name = h.block(
        Name.embedView({
          slotId: 'name',
          model: model.name,
          viewInputs: {
            label: 'Name',
            placeholder: 'Your name',
            activeIndex: model.multiple.hover.activeIndex,
            ...appearance,
          },
        }),
      )

      const email = h.block(
        Email.embedView({
          slotId: 'email',
          model: model.email,
          viewInputs: {
            label: 'Email',
            placeholder: 'you@example.com',
            icon: defaultIcons.mail,
            activeIndex: model.multiple.hover.activeIndex,
            ...appearance,
          },
        }),
      )

      const errorEmail = h.block(
        ErrorEmail.embedView({
          slotId: 'error-email',
          model: model.errorEmail,
          viewInputs: {
            label: 'Email',
            placeholder: 'you@example.com',
            icon: defaultIcons.mail,
            error: 'Please enter a valid email address.',
            activeIndex: model.error.hover.activeIndex,
            ...appearance,
          },
        }),
      )

      return h.div(
        [
          h.Class(
            model.isDocEmbedded
              ? ''
              : 'max-w-180 m-[0_auto] p-[48px_24px] [&_header]:mb-8 [&_h1]:m-[0_0_8px] [&_h1]:text-[30px] [&_h1]:font-semibold [&_h1]:[letter-spacing:-0.025em] [&_p]:m-0 [&_p]:text-[16px] [&_p]:[color:var(--muted-foreground)] [&_section+section]:mt-8 [&_h2]:m-[0_0_16px] [&_h2]:text-[20px] [&_h2]:font-semibold',
          ),
        ],
        [
          model.isDocEmbedded
            ? null
            : h.header(
                [],
                [
                  h.h1([], ['InputGroup']),
                  h.p([], ['Input field group with fluid hover and validation.']),
                ],
              ),
          section(
            'Basic',
            h.block(
              Basic.embedView({
                slotId: 'basic',
                model: model.basic,
                viewInputs: { content: () => [search], ...appearance },
              }),
            ),
          ),
          section(
            'Multiple Fields',
            h.block(
              Multiple.embedView({
                slotId: 'multiple',
                model: model.multiple,
                viewInputs: { content: () => [name, email], ...appearance },
              }),
            ),
          ),
          section(
            'Error State',
            h.block(
              ErrorGroup.embedView({
                slotId: 'error',
                model: model.error,
                viewInputs: { content: () => [errorEmail], ...appearance },
              }),
            ),
          ),
        ],
      )
    })

    return InputGroupExampleBlock.makeLayer({
      init,
      update,
      inMessageUpdate,
      view,
    }).pipe(
      Layer.provide(
        Layer.mergeAll(InputGroupLayer, InputFieldLayer, PreviewControlsLayer, tabsMotion.layer),
      ),
    )
  }),
)
