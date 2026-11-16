import { Layer } from 'effect'
import { createInputMessageQueueNativeLayer } from '@foldkit-visuals/fluid/input-message-queue'
import { createQueuedStackFramesLayer } from '@foldkit-visuals/fluid/queued-stack'
import { makeFileThumbnailResourcesLayer } from '@foldkit-visuals/fluid/file-thumbnail'
import { makeTouchPrimaryLayer } from '@foldkit-visuals/fluid/chat-message'
import { makeTooltipDomLayer } from '@foldkit-visuals/fluid/tooltip'
import { Program, Runtime } from 'foldkit'
import {
  InputQueueExampleBlock,
  createInputQueueExampleLayer,
} from './input-queue-example-block.js'
import './input-queue-layout.css'

const container = document.querySelector<HTMLDivElement>('#root')

if (container === null) {
  throw new Error('Missing queue example root')
}

const file = new window.File(
  [
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#7c9fea"/></svg>',
  ],
  'notes.svg',
  { type: 'image/svg+xml', lastModified: 0 },
)

const resources = Layer.mergeAll(
  createInputMessageQueueNativeLayer(window),
  createQueuedStackFramesLayer(window),
  makeTooltipDomLayer(document, window),
  makeTouchPrimaryLayer(window),
  makeFileThumbnailResourcesLayer({
    file: (id) => {
      if (id !== 'queue-image') {
        throw new Error(`Unknown file ${id}`)
      }

      return file
    },
  }),
)

Runtime.embed(
  Program.makeElement({
    block: InputQueueExampleBlock,
    layer: createInputQueueExampleLayer(window),
    container,
  }).provide(resources),
)
