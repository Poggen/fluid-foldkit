// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Effect, Layer } from 'effect'
import { FetchHttpClient, HttpClient } from 'effect/http'
import { Program, Runtime } from 'foldkit'
import { makeFileThumbnailResourcesLayer } from '@foldkit-visuals/fluid/file-thumbnail'
import { makeTouchPrimaryLayer } from '@foldkit-visuals/fluid/chat-message'
import {
  ChatMessageExampleBlock,
  createChatMessageExampleLayer,
} from './chat-message-example-block.js'
import './chat-message-example.css'
import portrait from '../../../../lib/assets/micka.png'

const container = document.querySelector<HTMLDivElement>('#root')
if (container === null) throw new Error('Missing ChatMessage example root')

const file = await Effect.runPromise(
  Effect.gen(function* acquirePortrait() {
    const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient)
    const response = yield* client.get(portrait)
    const bytes = yield* response.arrayBuffer
    return new File([bytes], 'micka.png', { type: 'image/png', lastModified: 0 })
  }).pipe(Effect.provide(FetchHttpClient.layer)),
)

Runtime.embed(
  Program.makeElement({
    block: ChatMessageExampleBlock,
    layer: createChatMessageExampleLayer(),
    container,
  }).provide(
    Layer.mergeAll(
      makeTouchPrimaryLayer(window),
      makeFileThumbnailResourcesLayer({
        file: (id) => {
          if (id !== 'chat-portrait') throw new Error(`Unknown ChatMessage file ${id}`)
          return file
        },
      }),
    ),
  ),
)
