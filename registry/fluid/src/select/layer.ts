// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Layer } from 'effect'
import { menuLayer } from '../dropdown.js'
import { SelectBlock } from './block.js'
import { init } from './init.js'
import { update, inMessageUpdate } from './update.js'
import { selectView } from './view.js'
import { ObserveForm } from './form.js'
import { Acknowledge, ClearSearch } from './effects.js'

const implementation = {
  init,
  update,
  inMessageUpdate,
  view: selectView,
  EffectsLayer: Layer.mergeAll(Acknowledge.layer, ClearSearch.layer, ObserveForm.layer),
}

export const layer = SelectBlock.makeLayer<typeof implementation>(implementation).pipe(
  Layer.provide(menuLayer),
)
