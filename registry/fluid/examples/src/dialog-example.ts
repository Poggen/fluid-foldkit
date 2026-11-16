import { Input } from '@foldkit/ui'
import { examplePresentation } from './example-presentation.js'
import { Layer, Option } from 'effect'
import { Program, Runtime } from 'foldkit'
import { childAttributes } from 'foldkit/html'
import {
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogLayer,
  createDialogContentContext,
} from '@foldkit-visuals/fluid/dialog'
import type { DialogContext, DialogProps } from '@foldkit-visuals/fluid/dialog'
import { Button } from '@foldkit-visuals/fluid/button'
import { createPresentationContext } from '@foldkit-visuals/fluid/presentation'
import { dialogCopy } from './dialog-example-content.js'
import { dialogLabView } from './dialog-example-lab.js'
import {
  DialogExampleBlock,
  DialogExampleComposition,
  Message,
  Basic,
  Small,
  Large,
  ExtraLarge,
  Controlled,
  Outer,
  Nested,
  Scoped,
  Seeded,
  motion,
  services,
  init,
  update,
  SetTheme,
} from './dialog-example-block.js'
import './dialog-example.css'

const presentation = createPresentationContext({ reducedMotion: 'user', ...examplePresentation })

const view = DialogExampleComposition.makeView((model, h) => {
  const density = model.isCompact ? 'compact' : 'default'

  const button = (label: string, attributes: Parameters<typeof h.button>[0] = []) =>
    Button({ children: [label], variant: 'secondary', attributes, ...examplePresentation }, h)

  const close = (context: DialogContext, label: string) =>
    DialogClose(
      {
        attributes: context.close,
        children: [],
        render: (attributes) =>
          Button(
            {
              ...context.presentation,
              variant: 'ghost',
              children: [label],
              attributes,
              ...examplePresentation,
            },
            h,
          ),
      },
      h,
    )

  const heading = (context: DialogContext, title: string, description: string) =>
    DialogHeader(
      {
        children: [
          DialogTitle({ ...context.presentation, dialogId: context.id, children: [title] }, h),
          DialogDescription(
            { ...context.presentation, dialogId: context.id, children: [description] },
            h,
          ),
        ],
      },
      h,
    )

  const options = (label: string, title: string, description: string): DialogProps => ({
    animate: motion.node,
    context: presentation,
    presentation: { size: density },
    hasDescription: true,
    trigger: (attributes) => button(label, attributes),
    content: (context) => [
      heading(context, title, description),
      DialogFooter({ children: [close(context, 'Close')] }, h),
    ],
  })

  const basic = options(...dialogCopy.basic)

  const outer = options(...dialogCopy.outer)

  const nested = Option.isSome(model.maybeNested)
    ? h.block(
        Nested.embedView({
          slotId: 'nested',
          model: model.maybeNested.value,
          viewInputs: {
            ...options(...dialogCopy.nested),
            context: createDialogContentContext(outer),
            ...examplePresentation,
          },
        }),
      )
    : h.empty

  const section = (title: string, children: ReadonlyArray<ReturnType<typeof h.div>>) =>
    h.section([], [h.h2([], [title]), h.div([h.Class('preview')], [...children])])

  return {
    title: 'Dialog · Fluid',
    body: h.main(
      [
        h.Class(
          'max-w-220 m-[0_auto] p-[48px_24px_96px] [&_h1]:text-[28px] [&_h1]:m-[24px_0_8px] [&_>_p]:[color:var(--muted-foreground)] [&_>_section_>_h2]:text-[16px] [&_>_section_>_h2]:m-[32px_0_12px] [&_.preview]:flex [&_.preview]:flex-wrap [&_.preview]:gap-3 [&_.preview]:items-center [&_.preview]:justify-center [&_.preview]:min-h-40 [&_.preview]:p-6 [&_.preview]:[border:1px_solid_var(--border)] [&_.preview]:rounded-[12px]',
        ),
      ],
      [
        dialogLabView(model, h),
        h.a([h.Href('./')], ['← All components']),
        h.h1([], ['Dialog']),
        h.p([], ['3 widths, spring in and out.']),
        h.div(
          [h.Class('flex flex-wrap gap-3 items-center')],
          [
            button(model.isCompact ? 'Density: compact' : 'Density: default', [
              h.Id('density'),
              h.OnClick(Message.ClickedDensity()),
            ]),
          ],
        ),
        section('Basic', [
          h.block(
            Basic.embedView({
              slotId: 'basic',
              model: model.basic,
              viewInputs: {
                ...basic,
                trigger: (attributes) =>
                  Button(
                    {
                      variant: 'tertiary',
                      children: ['Open dialog'],
                      attributes,
                      ...examplePresentation,
                    },
                    h,
                  ),
                content: (context) => [
                  heading(context, dialogCopy.basic[1], dialogCopy.basic[2]),
                  DialogFooter(
                    {
                      children: [
                        close(context, 'Cancel'),
                        Button(
                          { ...context.presentation, children: ['Create'], ...examplePresentation },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                ],
                ...examplePresentation,
              },
            }),
          ),
        ]),
        section('Initial open state', [
          button(
            Option.isSome(model.maybeSeeded) ? 'Unmount seeded dialog' : 'Mount seeded dialog',
            [h.OnClick(Message.ClickedSeeded())],
          ),
          Option.isSome(model.maybeSeeded)
            ? h.block(
                Seeded.embedView({
                  slotId: 'seeded',
                  model: model.maybeSeeded.value,
                  viewInputs: options(...dialogCopy.seeded),
                }),
              )
            : h.empty,
        ]),
        section('Sizes', [
          h.block(
            Small.embedView({
              slotId: 'small',
              model: model.small,
              viewInputs: {
                ...options(...dialogCopy.small),
                size: 'sm',
                ...examplePresentation,
              },
            }),
          ),
          h.block(
            Large.embedView({
              slotId: 'large',
              model: model.large,
              viewInputs: {
                ...options(...dialogCopy.large),
                size: 'lg',
                ...examplePresentation,
              },
            }),
          ),
          h.block(
            ExtraLarge.embedView({
              slotId: 'extra-large',
              model: model.extraLarge,
              viewInputs: {
                ...options(...dialogCopy.extraLarge),
                size: 'xl',
                ...examplePresentation,
              },
            }),
          ),
        ]),
        section('Controlled close admission', [
          button(model.shouldAcceptClose ? 'Close requests: accepted' : 'Close requests: ignored', [
            h.Id('admission'),
            h.OnClick(Message.ClickedAdmission()),
          ]),
          h.span([h.Id('close-requests')], [`Close requests: ${model.closeRequests}`]),
          h.block(
            Controlled.embedView({
              slotId: 'controlled',
              model: model.controlled,
              viewInputs: {
                ...options(...dialogCopy.controlled),
                contentAttributes: childAttributes([
                  h.DataAttribute('caller-content', 'controlled'),
                ]),
                contentClassName: 'caller-dialog-panel',
                contentRender: (attributes, children) => h.section(attributes, [...children]),
                triggerAttributes: childAttributes([
                  h.DataAttribute('caller-trigger', 'controlled'),
                ]),
                content: (context) => [
                  heading(
                    context,
                    'Controlled dialog',
                    'Escape, outside pointer and close controls request admission.',
                  ),
                  button(
                    model.shouldAcceptClose ? 'Ignore close requests' : 'Accept close requests',
                    [h.OnClick(Message.ClickedAdmission())],
                  ),
                  Input.view(
                    {
                      id: 'dialog-teamspace-name',
                      placeholder: 'Teamspace name',
                      toView: (attributes) =>
                        h.input([
                          ...attributes.input,
                          ...context.initialFocus,
                          h.AriaLabel('Teamspace name'),
                          h.Class(
                            'block w-full [border:1px_solid] rounded-[6px] p-[8px_12px] bg-transparent mt-4',
                          ),
                        ]),
                    },
                    h,
                  ),
                  DialogFooter(
                    {
                      children: [
                        close(context, 'Request close'),
                        button('Parent closes', [h.OnClick(Message.ClickedForceClose())]),
                      ],
                    },
                    h,
                  ),
                ],
                ...examplePresentation,
              },
            }),
          ),
        ]),
        section('Nested dialogs and cleanup', [
          Option.isSome(model.maybeOuter)
            ? h.block(
                Outer.embedView({
                  slotId: 'outer',
                  model: model.maybeOuter.value,
                  viewInputs: {
                    ...outer,
                    content: (context) => [
                      heading(
                        context,
                        'Parent dialog',
                        'Focus returns here after closing the nested dialog.',
                      ),
                      nested,
                      DialogFooter(
                        {
                          children: [
                            close(context, 'Close parent'),
                            button('Unmount dialogs', [h.OnClick(Message.ClickedUnmount())]),
                          ],
                        },
                        h,
                      ),
                    ],
                    ...examplePresentation,
                  },
                }),
              )
            : h.span([], ['Dialogs unmounted']),
          button(model.isMounted ? 'Unmount dialogs' : 'Remount dialogs', [
            h.Id('toggle-mounted'),
            h.OnClick(Message.ClickedUnmount()),
          ]),
        ]),
        h.section(
          [],
          [
            h.h2([], ['Scoped portal and interruption']),
            h.div(
              [
                h.Class(
                  'relative overflow-hidden min-h-105 p-6 [border:1px_solid_var(--border)] rounded-[12px] flex gap-3 items-start flex-wrap',
                ),
                h.Id('dialog-portal-region'),
              ],
              [
                h.block(
                  Scoped.embedView({
                    slotId: 'scoped',
                    model: model.scoped,
                    viewInputs: {
                      ...options(...dialogCopy.scoped),
                      portalContainerId: 'dialog-portal-region',
                      position: 'top',
                      showCloseButton: false,
                      ...examplePresentation,
                    },
                  }),
                ),
                button('Reopen scoped dialog', [
                  h.Id('reopen-scoped'),
                  h.OnClick(Message.ClickedReopenScoped()),
                ]),
                Input.view(
                  {
                    id: 'dialog-outside-focus',
                    placeholder: 'Outside focus target',
                    toView: (attributes) =>
                      h.input([
                        ...attributes.input,
                        h.AriaLabel('Outside scoped dialog'),
                        h.Class(
                          'block w-full [border:1px_solid] rounded-[6px] p-[8px_12px] bg-transparent mt-4',
                        ),
                      ]),
                  },
                  h,
                ),
              ],
            ),
          ],
        ),
        section('Composed layouts', [
          h.a([h.Href('./sidebar-recipes.html?recipe=settings')], ['Open settings example']),
          h.a([h.Href('./command-menu.html')], ['Open command menu example']),
        ]),
        button('After dialogs', [h.Id('after-dialogs')]),
      ],
    ),
  }
})

const layer = DialogExampleBlock.makeLayer({
  init,
  update,
  view,
  EffectsLayer: SetTheme.layer,
}).pipe(Layer.provide(DialogLayer))

Runtime.run(
  Program.make({
    block: DialogExampleBlock,
    layer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }).provide({ services, runtime: motion.layer }),
)
