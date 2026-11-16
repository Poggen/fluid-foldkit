import type { ShapeVariant } from '../lib/shape.js'
import type { DocumentTooltipOccurrenceViewInputs } from '../tooltip-native-public.js'
import type { Layer } from 'effect'
import type { CalendarVisuals } from './mount.js'
import type { Attribute, ChildAttribute, Html, HtmlBuilder } from 'foldkit/html'
import type { Message } from '../calendar-definition.js'
import type { Action, CalendarState, DateValue, Projection, Selection } from '../calendar-state.js'
import type { PresentationContext } from '../presentation.js'
import type { TargetMotionOptions } from '../motion-target.js'
import type { PresentationProjection, VisualState } from './state.js'

export type CalendarMessage = typeof Message.Type

export type CalendarMountRequirements = Layer.Success<typeof CalendarVisuals.layer>

export type H = HtmlBuilder<CalendarMessage, CalendarMountRequirements>

export const slotNames = [
  'Chevron',
  'CaptionLabel',
  'Day',
  'DayButton',
  'Dropdown',
  'DropdownNav',
  'Footer',
  'Month',
  'MonthCaption',
  'MonthGrid',
  'Months',
  'Nav',
  'Option',
  'PreviousMonthButton',
  'NextMonthButton',
  'Root',
  'Select',
  'Weeks',
  'Week',
  'Weekday',
  'Weekdays',
  'WeekNumber',
  'WeekNumberHeader',
  'MonthsDropdown',
  'YearsDropdown',
] satisfies ReadonlyArray<SlotName>

export type SlotName =
  | 'Chevron'
  | 'CaptionLabel'
  | 'Day'
  | 'DayButton'
  | 'Dropdown'
  | 'DropdownNav'
  | 'Footer'
  | 'Month'
  | 'MonthCaption'
  | 'MonthGrid'
  | 'Months'
  | 'Nav'
  | 'Option'
  | 'PreviousMonthButton'
  | 'NextMonthButton'
  | 'Root'
  | 'Select'
  | 'Weeks'
  | 'Week'
  | 'Weekday'
  | 'Weekdays'
  | 'WeekNumber'
  | 'WeekNumberHeader'
  | 'MonthsDropdown'
  | 'YearsDropdown'

export type CalendarChild = Html | string

export interface CalendarContext {
  readonly calendar: CalendarState
  readonly projection: Projection & PresentationProjection
  readonly visual: VisualState
  readonly selected: Selection
  readonly request: (action: Action) => CalendarMessage
  readonly goToMonth: (month: DateValue) => CalendarMessage
  readonly render: (name: SlotName, props: SlotProps) => Html
}

export interface SlotProps {
  readonly attributes: ReadonlyArray<Attribute<CalendarMessage> | ChildAttribute>
  readonly children: ReadonlyArray<CalendarChild>
  readonly sourceChildren?: ReadonlyArray<CalendarChild>
  readonly context: CalendarContext
  readonly key?: string
  readonly month?: Projection['months'][number]
  readonly displayIndex?: number
  readonly week?: Projection['months'][number]['weeks'][number]
  readonly day?: Projection['months'][number]['weeks'][number]['days'][number]
  readonly iconSize?: number
  readonly orientation?: 'left' | 'right' | 'up' | 'down'
  readonly select?: {
    readonly value: string
    readonly label: string
    readonly options: ReadonlyArray<DropdownOption>
    readonly request: (value: string) => CalendarMessage
  }
}

export interface DropdownOption {
  readonly value: number
  readonly label: string
  readonly disabled: boolean
  readonly month: number
}

export interface PublicSlotContext {
  readonly calendar: CalendarState
  readonly projection: Projection & PresentationProjection
  readonly visual: VisualState
  readonly selected: Selection
}

export type PublicSlotProps = Omit<
  SlotProps,
  'attributes' | 'context' | 'select' | 'sourceChildren'
> & {
  readonly attributes: ReadonlyArray<ChildAttribute>
  readonly select?: Omit<NonNullable<SlotProps['select']>, 'request'>
  readonly context: PublicSlotContext
}

export interface CalendarComponentRequest {
  readonly name: SlotName
  readonly props: PublicSlotProps
  readonly defaultView: () => Html
  readonly onClick: (action: Action) => ReadonlyArray<ChildAttribute>
  readonly render: (
    name: SlotName,
    children: ReadonlyArray<CalendarChild>,
    options?: Pick<SlotProps, 'key' | 'month' | 'displayIndex' | 'week' | 'day' | 'orientation'>,
  ) => Html
}

export type Slot = (request: CalendarComponentRequest) => Html

export interface CalendarViewInputs {
  readonly presentationContext: PresentationContext
  readonly keyboardTrigger: boolean
  readonly compact: boolean
  readonly fill: boolean
  readonly pill: boolean
  readonly cellSize?: number
  readonly shape: {
    readonly variant?: ShapeVariant
    readonly bg: string
    readonly focusRing: string
    readonly button: string
  }
  readonly className?: string
  readonly wrapperClassName?: string
  readonly attributes?: ReadonlyArray<ChildAttribute>
  readonly footer?: CalendarChild
  readonly classNames?: Partial<
    Record<
      | SlotName
      | 'DropdownRoot'
      | 'disabled'
      | 'hidden'
      | 'outside'
      | 'focused'
      | 'today'
      | 'selected'
      | 'range_start'
      | 'range_middle'
      | 'range_end',
      string
    >
  >
  readonly styles?: Partial<Record<SlotName | 'DropdownRoot', Readonly<Record<string, string>>>>
  readonly modifiersClassNames?: Readonly<Record<string, string>>
  readonly modifiersStyles?: Readonly<Record<string, Readonly<Record<string, string>>>>
  readonly customComponents?: ReadonlyArray<SlotName>
  readonly renderComponent?: (request: CalendarComponentRequest) => Html
  readonly dayDetail?: (date: Date) => CalendarChild
  readonly animate: (node: Html, options: TargetMotionOptions) => Html
  readonly tooltip: (request: {
    readonly content: string
    readonly render: (request: {
      readonly button: Parameters<DocumentTooltipOccurrenceViewInputs['trigger']>[0]['button']
    }) => Html
  }) => Html
  readonly chevron: (
    attributes: ReadonlyArray<ChildAttribute>,
    orientation: 'left' | 'right' | 'up' | 'down',
    size?: number,
  ) => Html
}

export interface ViewContext extends CalendarContext {
  readonly h: H
  readonly inputs: CalendarViewInputs
  readonly stacked: boolean
  readonly twoUp: boolean
  readonly cellSize: number
  readonly picking: boolean
  readonly isEnd: (ordinal: number) => boolean
}
