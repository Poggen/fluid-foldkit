import type { PlaygroundConfiguration } from './configuration'
import type { PreviewOptions } from './legacy-options'

export const legacyOptions: (configuration: PlaygroundConfiguration) => PreviewOptions = (
  configuration: PlaygroundConfiguration,
) => (configuration._tag === 'chart' ? configuration.options : {})
