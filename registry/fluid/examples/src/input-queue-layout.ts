import { Program, Runtime } from 'foldkit'
import {
  InputQueueLayoutExampleBlock,
  createInputQueueLayoutLayer,
} from './input-queue-layout-block.js'
import './input-queue-layout.css'

const container = document.querySelector<HTMLDivElement>('#root')
if (container === null) throw new Error('Missing queue example root')
Runtime.embed(
  Program.makeElement({
    block: InputQueueLayoutExampleBlock,
    layer: createInputQueueLayoutLayer({
      reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    }),
    container,
  }),
)
