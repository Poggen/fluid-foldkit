import { sourceStyleAttributes } from './lib/source-style-attributes.js'
// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { modifyFields } from 'foldkit/struct'
import { Option, Schema, Number } from 'effect'
import { Block } from 'foldkit'
import type { ChildAttribute } from 'foldkit/html'
import { defineInMessageUnion, defineMessageUnion } from 'foldkit/message'
import { cn } from './lib/utils.js'
import { resolvePresentation } from './presentation.js'
import type { Presentation } from './presentation.js'
import { FileThumbnailResources } from './file-thumbnail-resources.js'

export {
  FileThumbnailResources,
  FileThumbnailResourcesServerLayer,
  makeFileThumbnailResourcesLayer,
  setPdfWorkerSrc,
} from './file-thumbnail-resources.js'

export type { FileThumbnailCapabilities, FilePreviewRequest } from './file-thumbnail-resources.js'

export {
  PdfPreviewError,
  PdfjsLoaderService,
  PdfjsLoaderLayer,
  makePdfjsLoaderLayer,
  loadPdfjs,
  renderPdfFirstPage,
} from './file-thumbnail-pdf.js'

export type {
  PdfjsModule,
  PdfLoadingTask,
  PdfDocument,
  PdfPage,
  PdfViewport,
  PdfRenderTask,
  PdfjsLoader,
} from './file-thumbnail-pdf.js'

const FileIdentity = Schema.Struct({ id: Schema.String, name: Schema.String, type: Schema.String })

export interface FileThumbnailConfig {
  readonly id: string
  readonly file: typeof FileIdentity.Type
  readonly size: number
}

const Model = Schema.Struct({
  id: Schema.String,
  file: FileIdentity,
  size: Schema.NumberFromString,
  generation: Schema.Natural,
  url: Schema.OptionFromNullOr(Schema.String),
  failed: Schema.Boolean,
})

const Message = defineMessageUnion({
  Loaded: { generation: Schema.Natural, url: Schema.String },
  Failed: { generation: Schema.Natural },
  Unmounted: {},
})

export const InMessage = defineInMessageUnion({
  RequestedConfigure: { file: FileIdentity, size: Schema.NumberFromString },
})

export const FileThumbnailKey = Symbol('FluidFileThumbnail')

const effects = Block.makeEffectsContract<never, FileThumbnailResources>()

export const FileThumbnailBlock = Block.make('FileThumbnail', {
  key: FileThumbnailKey,
  InitArgs: Schema.Tuple([
    Schema.Struct({ id: Schema.String, file: FileIdentity, size: Schema.NumberFromString }),
  ]),
  Model,
  Message,
  InMessage,
  view: { kind: 'Element', Inputs: Block.makeInputContract<FileThumbnailProps>() },
  effects,
})

const Observe = FileThumbnailBlock.makeMountStream('Observe', {
  args: { fileId: Schema.String, size: Schema.NumberFromString, generation: Schema.Natural },
  messages: [Message.Loaded, Message.Failed],
  *handler() {
    const resources = yield* FileThumbnailResources

    return ({ element, fileId, size, generation, viewStateChanges }) =>
      resources.observe({ fileId, size, generation, states: viewStateChanges, element })
  },
})

const FileThumbnailComposition = FileThumbnailBlock.makeComposition({
  mounts: [Observe],
})

const init = FileThumbnailComposition.makeInit((config: FileThumbnailConfig) => ({
  model: Model.make({
    id: config.id,
    file: config.file,
    size: config.size,
    generation: 0,
    url: Option.none(),
    failed: false,
  }),
}))

const update = FileThumbnailComposition.makeUpdate({
  Loaded: (model, { generation, url }) => ({
    model:
      generation === model.generation
        ? modifyFields(model, { url: () => Option.some(url), failed: () => false })
        : model,
  }),
  Failed: (model, { generation }) => ({
    model: generation === model.generation ? modifyFields(model, { failed: () => true }) : model,
  }),
  Unmounted: (model) => ({
    model: modifyFields(model, {
      url: () => Option.none(),
      failed: () => false,
      generation: Number.increment,
    }),
  }),
})

const inMessageUpdate = FileThumbnailComposition.makeInMessageUpdate({
  RequestedConfigure: (model, { file, size }) => {
    const sameFile = file.id === model.file.id
    if (sameFile) {
      if (Object.is(size, model.size)) {
        return {
          model:
            file.name === model.file.name && file.type === model.file.type
              ? model
              : modifyFields(model, { file: () => file }),
        }
      }

      if (file.type !== 'application/pdf') {
        return { model: modifyFields(model, { file: () => file, size: () => size }) }
      }
    }

    return {
      model: modifyFields(model, {
        file: () => file,
        size: () => size,
        generation: Number.increment,
        url: (currentUrl) =>
          sameFile && file.type === 'application/pdf' ? currentUrl : Option.none(),
        failed: () => false,
      }),
    }
  },
})

export interface FileThumbnailProps extends Presentation {
  readonly radius?: number
  readonly className?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
}

const view = FileThumbnailComposition.makeView.withInputs<FileThumbnailProps>(
  (model, inputs, h) => {
    const isImage = model.file.type.startsWith('image/')
    const isPdf = model.file.type === 'application/pdf'
    const previewUrl = Option.getOrNull(model.url)
    const hasPreview = previewUrl !== null && previewUrl !== ''
    const pending = (isImage && !hasPreview) || (isPdf && !hasPreview && !model.failed)
    const glyph = Math.max(16, model.size * 0.35)

    const preview = () => {
      if (hasPreview) {
        return h.img([
          h.Src(previewUrl),
          h.Alt(model.file.name),
          h.Class('absolute inset-0 w-full h-full object-cover'),
        ])
      }

      if (pending) {
        return h.div(
          [h.Class('absolute inset-0 flex items-center justify-center')],
          [
            h.div([
              h.Class(
                'w-6 h-6 rounded-full border-2 border-border border-t-muted-foreground animate-spin',
              ),
              h.AriaLabel('Loading preview'),
              h.Role('status'),
            ]),
          ],
        )
      }

      return h.div(
        [
          h.Class('absolute inset-0 flex items-center justify-center text-muted-foreground'),
          h.Role('img'),
          h.AriaLabel(model.file.name),
        ],
        [
          h.svg(
            [
              h.Width(String(glyph)),
              h.Height(String(glyph)),
              h.ViewBox('0 0 24 24'),
              h.Fill('none'),
              h.Stroke('currentColor'),
              h.StrokeWidth('1.5'),
              h.StrokeLinecap('round'),
              h.StrokeLinejoin('round'),
              h.AriaHidden(true),
            ],
            [
              h.path([h.D('M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z')]),
              h.path([h.D('M14 3v5h5')]),
            ],
          ),
        ],
      )
    }

    return h.div(
      sourceStyleAttributes(
        inputs.radius === undefined
          ? { width: `${model.size}px`, height: `${model.size}px` }
          : {
              width: `${model.size}px`,
              height: `${model.size}px`,
              borderRadius: `${inputs.radius}px`,
            },
        [
          h.Class(
            cn(
              'relative shrink-0 overflow-hidden bg-accent outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
              resolvePresentation(inputs).shape.bg,
              inputs.className,
            ),
          ),
          h.Id(model.id),
          h.OnUnmount(Message.Unmounted()),
          ...(inputs.attributes ?? []),
        ],
      ),
      [
        h.keyed('span')(String(model.generation), [
          h.Class('contents'),
          h.OnMount(
            Observe({
              fileId: model.file.id,
              size: isPdf ? model.size : 0,
              generation: model.generation,
            }),
          ),
        ]),
        preview(),
      ],
    )
  },
)

export const layer = FileThumbnailBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
  EffectsLayer: Observe.layer,
})
