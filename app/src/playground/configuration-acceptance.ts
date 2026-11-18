import { configuredSidebarOpen } from '../gallery/fluid'
import { breadcrumbChoices, dropdownIndex, visibleItems } from './configs/breadcrumb'
import { Match, Option } from 'effect'
import { colorValueOf } from '@foldkit-visuals/fluid/color-picker'
import type { PlaygroundConfiguration } from './configuration'
import type { FluidGalleryModel } from '../gallery/fluid/block'

export const editedConfigurationFields: (
  before: PlaygroundConfiguration,
  after: PlaygroundConfiguration,
) => ReadonlyArray<string> = (before: PlaygroundConfiguration, after: PlaygroundConfiguration) => {
  if (before._tag !== after._tag) return ['*']
  const previous = new Map(Object.entries(before))
  return Object.entries(after).flatMap(([key, value]) =>
    JSON.stringify(previous.get(key)) === JSON.stringify(value) ? [] : [key],
  )
}

export const acceptConfiguration: (
  configuration: PlaygroundConfiguration,
  before: FluidGalleryModel,
  after: FluidGalleryModel,
) => PlaygroundConfiguration = (
  configuration: PlaygroundConfiguration,
  before: FluidGalleryModel,
  after: FluidGalleryModel,
) =>
  Match.value(configuration).pipe(
    Match.tag('breadcrumb', (c) => {
      if (before.crumbSection === after.crumbSection || after.crumbSection === null) return c
      const item = visibleItems(c)[dropdownIndex(c)],
        label = breadcrumbChoices[after.crumbSection]
      return item === undefined || label === undefined
        ? c
        : {
            ...c,
            items: c.items.map((existing) =>
              existing.id === item.id ? { ...existing, label } : existing,
            ),
          }
    }),
    Match.tag('input', (c) =>
      before.input.value === after.input.value ? c : { ...c, value: after.input.value },
    ),
    Match.tag('textarea', (c) =>
      before.textarea.value === after.textarea.value ? c : { ...c, value: after.textarea.value },
    ),
    Match.tag('field', (c) =>
      before.search.value === after.search.value ? c : { ...c, value: after.search.value },
    ),
    Match.tag('input-group', (c) =>
      before.first.value === after.first.value &&
      before.last.value === after.last.value &&
      before.website.value === after.website.value
        ? c
        : {
            ...c,
            firstValue: after.first.value,
            secondValue: after.last.value,
            thirdValue: after.website.value,
          },
    ),
    Match.tag('thinking-steps', (c) =>
      Option.getOrNull(before.steps.manual) === Option.getOrNull(after.steps.manual)
        ? c
        : { ...c, open: after.steps.open },
    ),
    Match.tag('checkbox', (c) =>
      before.checkbox.checked === after.checkbox.checked &&
      before.checkbox.indeterminate === after.checkbox.indeterminate
        ? c
        : { ...c, checked: after.checkbox.checked, indeterminate: after.checkbox.indeterminate },
    ),
    Match.tag('switch', (c) =>
      before.switch.checked === after.switch.checked ? c : { ...c, checked: after.switch.checked },
    ),
    Match.tag('slider', (c) => {
      const previous = before.slider.settings.value,
        current = after.slider.settings.value
      if (JSON.stringify(previous) === JSON.stringify(current)) return c
      return typeof current === 'number'
        ? { ...c, value: current }
        : { ...c, value: current[0] ?? c.value, upperValue: current[1] ?? c.upperValue }
    }),
    Match.tag('color-picker', (c) =>
      colorValueOf(before.color) === colorValueOf(after.color)
        ? c
        : { ...c, value: colorValueOf(after.color) },
    ),
    Match.tag('input-message', (c) =>
      Option.getOrNull(before.composer.status) === Option.getOrNull(after.composer.status)
        ? c
        : ({
            ...c,
            status:
              after.composer.status._tag === 'None'
                ? 'off'
                : after.composer.status.value === 'streaming'
                  ? 'streaming'
                  : 'idle',
          } satisfies PlaygroundConfiguration),
    ),
    Match.tag('sidebar', (c) => {
      const previous = configuredSidebarOpen(before)
      const current = configuredSidebarOpen(after)
      return Option.isSome(previous) && Option.isSome(current) && previous.value !== current.value
        ? ({ ...c, state: current.value ? 'opened' : 'closed' } satisfies PlaygroundConfiguration)
        : c
    }),
    Match.orElse((c) => c),
  )

export const needsChildReconciliation: (
  configuration: PlaygroundConfiguration,
  before: FluidGalleryModel,
  after: FluidGalleryModel,
) => boolean = (
  configuration: PlaygroundConfiguration,
  before: FluidGalleryModel,
  after: FluidGalleryModel,
) =>
  Match.value(configuration).pipe(
    Match.tag(
      'dropdown',
      () =>
        before.dropdownQuery !== after.dropdownQuery ||
        before.dropdownCreatedItems !== after.dropdownCreatedItems,
    ),
    Match.tag(
      'command-menu',
      () =>
        before.commandTabs.value !== after.commandTabs.value ||
        before.commandFilter.value !== after.commandFilter.value ||
        before.commandSort.value !== after.commandSort.value,
    ),
    Match.tag('input-message', () => before.composerHistory !== after.composerHistory),
    Match.orElse(() => false),
  )
