import { sourceStyleAttributes } from './lib/source-style-attributes.js'
import { makeInitIfMissingStep } from 'foldkit/binding'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { Data, Layer, Option, Predicate, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import type { Attribute, ChildAttribute, Html } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { FileThumbnailBlock, layer as FileThumbnailLayer } from './file-thumbnail.js'
import type { FileThumbnailResources, FileThumbnailConfig } from './file-thumbnail.js'
import { MessageFile } from './input-message-domain.js'
import type { TouchPrimaryResources } from './touch-primary.js'
import { TouchPrimaryBlock, layer as TouchPrimaryLayer } from './touch-primary.js'
import { spring } from './lib/springs.js'
import { typeClass } from './lib/type-scale.js'
import { cn } from './lib/utils.js'
import type { TargetMotionOptions } from './motion-target.js'
import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'

const From = Schema.Literals(['user', 'assistant'])

const Model = Schema.Struct({
  id: Schema.String,
  from: From,
  files: Schema.Array(MessageFile),
  thumbnailSize: Schema.Finite,
  entered: Schema.Boolean,
  touch: TouchPrimaryBlock.Model,
  thumbnails: Schema.Record(Schema.String, FileThumbnailBlock.Model),
})

const Message = defineMessageUnion({
  Entered: {},
})

export const InMessage = defineInMessageUnion({
  RequestedConfigure: {
    from: From,
    files: Schema.Array(MessageFile),
    thumbnailSize: Schema.Finite,
  },
})

export const ChatMessageKey = Symbol('FluidChatMessage')

const effects = Block.makeEffectsContract<never, FileThumbnailResources | TouchPrimaryResources>()

export const ChatMessageBlock = Block.make('ChatMessage', {
  key: ChatMessageKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({
      id: Schema.String,
      from: From,
      files: Schema.optionalKey(Schema.Array(MessageFile)),
      thumbnailSize: Schema.optionalKey(Schema.Finite),
    }),
  ]),
  Model,
  Message,
  InMessage,
  effects,
  view: { kind: 'Element', Inputs: Block.makeInputContract<ChatMessageViewInputs>() },
})

export interface ChatMessageConfig {
  readonly id: string
  readonly from: 'user' | 'assistant'
  readonly files?: ReadonlyArray<MessageFile>
  readonly thumbnailSize?: number
}

const Touch = ChatMessageBlock.makeRequiredFieldBinding(TouchPrimaryBlock, {
  field: 'touch',
  init: {
    contextToArgs: (config: ChatMessageConfig): [{ readonly id: string }] => [
      { id: `${config.id}-touch` },
    ],
  },
}).withOutMessagePolicy({
  fold: ChatMessageBlock.makeOutMessageFold(TouchPrimaryBlock, {
    Changed: () => ChatMessageBlock.makeNoopStep(),
  }),
})

const Thumbnail = ChatMessageBlock.makeRecordBinding(FileThumbnailBlock, { field: 'thumbnails' })

const ChatMessageComposition = ChatMessageBlock.makeComposition({ bindings: [Touch, Thumbnail] })

const initializeThumbnail = (options: {
  readonly key: string
  readonly args: [FileThumbnailConfig]
}) => makeInitIfMissingStep(Thumbnail, options)

// Source keys include the list position: replacing/reordering an attachment remounts its preview.
const fileKey = (file: MessageFile, index: number) =>
  `${file.name}-${file.size}-${file.lastModified}-${index}`

const init = ChatMessageComposition.makeInit((config: ChatMessageConfig) => ({
  childInitContext: config,
  model: {
    id: config.id,
    from: config.from,
    files: config.files ?? [],
    thumbnailSize: config.thumbnailSize ?? 64,
    entered: false,
    thumbnails: {},
  },
  steps: (config.files ?? []).map((file, index) =>
    initializeThumbnail({
      key: fileKey(file, index),
      args: [
        {
          id: `${config.id}-file-${encodeURIComponent(fileKey(file, index))}`,
          file,
          size: config.thumbnailSize ?? 64,
        },
      ],
    }),
  ),
}))

const update = ChatMessageComposition.makeUpdate({
  Entered: (model) => ({
    model: model.entered ? model : modifyFields(model, { entered: () => true }),
  }),
})

const inMessageUpdate = ChatMessageComposition.makeInMessageUpdate({
  RequestedConfigure: ChatMessageBlock.makeStep(
    (model, { from, files, thumbnailSize }: typeof InMessage.RequestedConfigure.Type) => {
      const thumbnails = Object.fromEntries(
        Object.entries(model.thumbnails).filter(([key]) =>
          files.some((file, index) => fileKey(file, index) === key),
        ),
      )

      return Update.combineSteps([
        ChatMessageBlock.makeStep(() => ({
          model: modifyFields(model, {
            from: () => from,
            files: () => files,
            thumbnailSize: () => thumbnailSize,
            thumbnails: () => thumbnails,
          }),
        })),
        ...files.map((file, index) =>
          thumbnails[fileKey(file, index)]
            ? Thumbnail.requestConfigure(fileKey(file, index), { file, size: thumbnailSize })
            : initializeThumbnail({
                key: fileKey(file, index),
                args: [
                  {
                    id: `${model.id}-file-${encodeURIComponent(fileKey(file, index))}`,
                    file,
                    size: thumbnailSize,
                  },
                ],
              }),
        ),
      ])
    },
  ),
})

export interface ChatMessageViewInputs extends Presentation {
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
  readonly children?: () => Html | string | null
  readonly time?: () => Html | string | null
  readonly actions?: () => Html | string | null
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

const view = ChatMessageComposition.makeView.withInputs<ChatMessageViewInputs>(
  (model, inputs, h) => {
    const { shape, size } = resolvePresentation(inputs)
    const user = model.from === 'user'
    const compact = size.variant === 'compact'
    const children = inputs.children?.()
    const time = inputs.time?.()
    const actions = inputs.actions?.()

    const Events =
      Data.taggedEnum<Extract<Attribute<typeof Message.Type>, { readonly _tag: 'OnCustomEvent' }>>()

    const completed = Events.OnCustomEvent({
      name: 'fluid-chat-entered',
      f: (event) =>
        event.target === event.currentTarget ? Option.some(Message.Entered()) : Option.none(),
    })

    const metadata = () =>
      (user && Predicate.isNotNullish(time)) || Predicate.isNotNullish(actions)
        ? h.div(
            [
              h.Class(
                cn(
                  'flex items-center gap-2 px-1 text-muted-foreground select-none',
                  typeClass('caption', size.variant),
                  !model.touch.isTouchPrimary &&
                    'opacity-0 pointer-events-none transition-opacity duration-150 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto',
                ),
              ),
            ],
            [
              user && Predicate.isNotNullish(time)
                ? h.span([h.Class('tabular-nums')], [time])
                : h.empty,
              Predicate.isNullish(actions)
                ? h.empty
                : h.span([h.Class('flex items-center gap-0.5')], [actions]),
            ],
          )
        : h.empty

    // Source Motion 14.1 keeps its initially disabled projection inert after entrance.
    // Callers can still add shared-layout options through their owning motion scope.
    return inputs.animate(
      h.div(
        sourceStyleAttributes({ transformOrigin: user ? 'bottom right' : 'bottom left' }, [
          h.Class(
            cn(
              'group flex max-w-[80%] flex-col gap-1.5',
              user ? 'items-end self-end' : 'items-start self-start',
              inputs.className,
            ),
          ),
          h.Id(model.id),
          completed,
          ...(inputs.attributes ?? []),
        ]),
        [
          model.files.length
            ? h.div(
                [h.Class(cn('flex flex-wrap gap-1.5', user ? 'justify-end' : 'justify-start'))],
                model.files.map((file, index) => {
                  const key = fileKey(file, index)
                  const thumbnail = model.thumbnails[key]

                  if (!thumbnail) {
                    throw new Error('ChatMessage thumbnail binding is missing')
                  }

                  return h.block(
                    Thumbnail.embedView({
                      key,
                      slotId: thumbnail.id,
                      model: thumbnail,
                      viewInputs: { context: createPresentationContext(inputs) },
                    }),
                  )
                }),
              )
            : h.empty,
          Predicate.isNotNullish(children) && children !== ''
            ? h.div(
                [
                  h.Class(
                    cn(
                      'whitespace-pre-wrap break-words',
                      compact ? 'py-1.5' : 'py-2',
                      typeClass('subtitle', size.variant),
                      user
                        ? cn(
                            shape.bg,
                            compact ? 'px-3' : 'px-3.5',
                            'text-pretty bg-[color-mix(in_oklab,var(--accent),var(--background)_45%)] text-foreground',
                          )
                        : 'text-foreground',
                    ),
                  ),
                ],
                [children],
              )
            : h.empty,
          metadata(),
        ],
      ),
      {
        initial: { opacity: 0, y: 8, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: spring.moderate,
        onAnimationComplete: (element) => {
          element.dispatchEvent(new CustomEvent('fluid-chat-entered'))
        },
      },
    )
  },
)

export const layer = ChatMessageBlock.makeLayer({ init, update, inMessageUpdate, view }).pipe(
  Layer.provide(Layer.merge(FileThumbnailLayer, TouchPrimaryLayer)),
)

export { makeTouchPrimaryLayer, TouchPrimaryServerLayer } from './touch-primary.js'
