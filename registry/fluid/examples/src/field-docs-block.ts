import { Layer } from 'effect'
import { layer as PreviewControlsLayer } from '../../../../components/docs/preview-controls'
import { layer as InputLayer } from '@foldkit-visuals/fluid/input'
import { layer as TextareaLayer } from '@foldkit-visuals/fluid/textarea'
import { layer as CheckboxLayer } from '@foldkit-visuals/fluid/checkbox'
import { layer as FieldLayer } from '@foldkit-visuals/fluid/field'
import { layer as SelectLayer } from '@foldkit-visuals/fluid/select'
import { FieldDocsBlock, init, update, inMessageUpdate } from './field-docs-definition.js'
import { view } from './field-docs-view.js'

export { FieldDocsBlock, Config, motion } from './field-docs-definition.js'

export const FieldDocsLayer = FieldDocsBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
  view,
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      InputLayer,
      TextareaLayer,
      CheckboxLayer,
      FieldLayer,
      SelectLayer,
      PreviewControlsLayer,
    ),
  ),
)
