import { Layer } from 'effect'
import { Program, Runtime } from 'foldkit'
import { createSelectLayer } from '@foldkit-visuals/fluid/select'
import { makeTooltipDomLayer } from '@foldkit-visuals/fluid/tooltip'
import {
  CalendarAuthoredBlock,
  layer,
  calendarEnvironmentLayer,
} from './calendar-authored-block.js'
import './calendar-authored.css'
Runtime.run(
  Program.makeElement({
    block: CalendarAuthoredBlock,
    layer,
    container: document.querySelector<HTMLDivElement>('#root'),
  }).provide(
    Layer.mergeAll(
      calendarEnvironmentLayer,
      createSelectLayer(document),
      makeTooltipDomLayer(document, window),
    ),
  ),
)
