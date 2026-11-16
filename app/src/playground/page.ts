import type { ComponentPage } from '../../../lib/catalogue'
import { controlsFor as chartControls, initialProps } from './catalogue'
import {
  configurationForPage,
  controlsForConfiguration,
  type PlaygroundConfiguration,
} from './configuration'
import type { Control } from './control-definition'

export const controlsFor = (page: ComponentPage): ReadonlyArray<Control> =>
  page.family === 'charts'
    ? chartControls(page)
    : controlsForConfiguration(configurationForPage(page))
export const initialConfiguration = (page: ComponentPage): PlaygroundConfiguration =>
  configurationForPage(page, page.family === 'charts' ? initialProps(page) : {})
export const controlValue = (
  configuration: PlaygroundConfiguration,
  property: string,
  fallback: string | number | boolean,
) => {
  if (configuration._tag === 'breadcrumb' && property.startsWith('item.')) {
    const [, id, field] = property.split('.')
    const item = configuration.items.find((item) => item.id === id)
    if (item !== undefined && (field === 'label' || field === 'icon')) return item[field]
  }
  const values = configuration._tag === 'chart' ? configuration.options : configuration
  const value = Object.entries(values).find(([key]) => key === property)?.[1]
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? value
    : fallback
}
