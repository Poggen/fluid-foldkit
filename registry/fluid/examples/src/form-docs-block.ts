import { Layer } from 'effect'
import { layer as PreviewControlsLayer } from '../../../../components/docs/preview-controls'
import { layer as InputLayer } from '@foldkit-visuals/fluid/input'
import { layer as TextareaLayer } from '@foldkit-visuals/fluid/textarea'
import { layer as CheckboxLayer } from '@foldkit-visuals/fluid/checkbox'
import { layer as FieldLayer } from '@foldkit-visuals/fluid/field'
import { FormDocsBlock, init, update, inMessageUpdate } from './form-docs-definition.js'
import { view } from './form-docs-view.js'

export { FormDocsBlock, Config, motion } from './form-docs-definition.js'

export const FormDocsLayer = FormDocsBlock.makeLayer({ init, update, inMessageUpdate, view }).pipe(
  Layer.provide(
    Layer.mergeAll(InputLayer, TextareaLayer, CheckboxLayer, FieldLayer, PreviewControlsLayer),
  ),
)
