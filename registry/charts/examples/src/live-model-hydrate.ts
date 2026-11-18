import { Program, Runtime } from 'foldkit'
import { liveModelExample } from './live-model.fixture'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

await document.fonts.load('500 14px Geist')

Runtime.hydrate(
  Program.make({
    ...liveModelExample(Number(document.querySelector<HTMLElement>('#root')?.dataset.epoch)),
    container: document.querySelector<HTMLElement>('[data-foldkit-app]'),
  }),
  { buildId: 'live-model-proof-v1' },
)
