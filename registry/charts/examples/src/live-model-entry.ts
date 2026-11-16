import { DateTime } from 'effect'
import { Program, Runtime } from 'foldkit'
import { liveModelExample } from './live-model-fixture'
import '@foldkit-visuals/charts/styles.css'
import './style.css'

await document.fonts.load('500 14px Geist')

Runtime.run(
  Program.make({
    ...liveModelExample(
      Number(new URLSearchParams(location.search).get('epoch')) ||
        Math.floor(DateTime.toEpochMillis(DateTime.nowUnsafe()) / 1000) - 39,
    ),
    container: document.querySelector<HTMLElement>('#root'),
  }),
)
