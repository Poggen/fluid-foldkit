import { Match, Predicate } from 'effect'
import { constUndefined } from 'effect/Function'
import { typeClass } from '../lib/type-scale.js'
import { cn } from '../lib/utils.js'
import { childAttributes } from 'foldkit/html'
import type { ChildAttribute, Html } from 'foldkit/html'
import { Action, dateValue } from '../calendar-state.js'
import { instantDate, zonedDate } from '../calendar-domain/date-boundary.js'
import type { CalendarContext, CalendarViewInputs, H, SlotName, SlotProps } from './contracts.js'

export const boundAttributes: (
  attributes: SlotProps['attributes'],
) => ReadonlyArray<ChildAttribute> = function boundAttributes(attributes: SlotProps['attributes']) {
  return attributes.flatMap((attribute) =>
    '__childAttribute' in attribute ? [attribute] : childAttributes([attribute]),
  )
}

export const hasCustomComponent: (inputs: CalendarViewInputs, name: SlotName) => boolean =
  function hasCustomComponent(inputs: CalendarViewInputs, name: SlotName) {
    return (
      inputs.renderComponent !== undefined && (inputs.customComponents?.includes(name) ?? false)
    )
  }

const modifierClass: (inputs: CalendarViewInputs, flag: string) => string | undefined =
  function modifierClass(inputs: CalendarViewInputs, flag: string) {
    return Match.value(flag).pipe(
      Match.whenOr(
        'disabled',
        'hidden',
        'outside',
        'focused',
        'today',
        'selected',
        'range_start',
        'range_middle',
        'range_end',
        (name) => inputs.classNames?.[name] ?? `rdp-${name}`,
      ),
      Match.orElse(constUndefined),
    )
  }

const dropdownInput: (h: H, name: SlotName, initialInput: SlotProps) => SlotProps | null =
  function dropdownInput(h: H, name: SlotName, initialInput: SlotProps) {
    let input = initialInput

    if ((name === 'MonthsDropdown' || name === 'YearsDropdown') && input.select === undefined) {
      const { context } = input
      const { projection } = context

      const dropdown =
        projection.dropdowns.find((item) => item.date === input.month?.date) ??
        projection.dropdowns[0]

      if (dropdown === undefined) {
        return null
      }

      const options = name === 'MonthsDropdown' ? dropdown.monthOptions : dropdown.yearOptions

      const select = {
        value: String(name === 'MonthsDropdown' ? dropdown.selectedMonth : dropdown.selectedYear),
        label: name === 'MonthsDropdown' ? dropdown.monthDropdownLabel : dropdown.yearDropdownLabel,
        options,
        request: (raw: string) => {
          const option = options.find((item) => String(item.value) === raw && !item.disabled)

          return context.goToMonth(
            option === undefined
              ? context.calendar.month
              : dateValue(
                  projection.timeZone === null
                    ? instantDate(option.month)
                    : zonedDate(option.month, projection.timeZone),
                ),
          )
        },
      }

      input = {
        ...input,
        select,
        attributes: [
          ...input.attributes,
          h.Value(select.value),
          h.AriaLabel(select.label),
          h.Disabled(projection.disableNavigation),
          h.OnChange(select.request),
        ],
      }
    }

    return input
  }

export const slotProps: (
  context: CalendarContext,
  attributes: SlotProps['attributes'],
  children: SlotProps['children'],
) => SlotProps = function slotProps(
  context: CalendarContext,
  attributes: SlotProps['attributes'],
  children: SlotProps['children'],
) {
  return { context, attributes, children }
}

const defaultClasses: Record<SlotName, string> = {
  Chevron: 'rdp-chevron',
  CaptionLabel: 'rdp-caption_label',
  Day: 'rdp-day',
  DayButton: 'rdp-day_button',
  Dropdown: 'rdp-dropdown',
  DropdownNav: 'rdp-dropdowns',
  Footer: 'rdp-footer',
  Month: 'rdp-month',
  MonthCaption: 'rdp-month_caption',
  MonthGrid: 'rdp-month_grid',
  Months: 'rdp-months',
  Nav: 'rdp-nav',
  Option: '',
  PreviousMonthButton: 'rdp-button_previous',
  NextMonthButton: 'rdp-button_next',
  Root: 'rdp-root',
  Select: '',
  Weeks: 'rdp-weeks',
  Week: 'rdp-week',
  Weekday: 'rdp-weekday',
  Weekdays: 'rdp-weekdays',
  WeekNumber: 'rdp-week_number',
  WeekNumberHeader: 'rdp-week_number_header',
  MonthsDropdown: 'rdp-months_dropdown',
  YearsDropdown: 'rdp-years_dropdown',
}

function slotPresentation(h: H, inputs: CalendarViewInputs, name: SlotName, input: SlotProps) {
  const ownClasses = input.attributes.flatMap((attribute) =>
    '__childAttribute' in attribute || !Predicate.isTagged(attribute, 'Class')
      ? []
      : [attribute.value],
  )

  const classes = [inputs.classNames?.[name] ?? defaultClasses[name]]

  const modifiers =
    name === 'Day' && input.day !== undefined
      ? Object.entries(input.day.flags).filter(([, enabled]) => enabled)
      : []

  for (const [flag] of modifiers) {
    const modifier = inputs.modifiersClassNames?.[flag]

    if (modifier !== undefined && modifier !== '') {
      classes.push(modifier)
    } else {
      const defaultClass = modifierClass(inputs, flag)

      if (defaultClass !== undefined) {
        classes.push(defaultClass)
      }
    }
  }

  const styles = { ...inputs.styles?.[name] }

  if (name === 'Dropdown') {
    for (const attribute of input.attributes) {
      if (!('__childAttribute' in attribute) && Predicate.isTagged(attribute, 'Style')) {
        Object.assign(styles, attribute.value)
      }
    }
  }

  for (const [flag] of modifiers) {
    Object.assign(styles, inputs.modifiersStyles?.[flag])
  }

  const defaultStyles = { ...styles }

  for (const attribute of input.attributes) {
    if (!('__childAttribute' in attribute) && Predicate.isTagged(attribute, 'Style')) {
      Object.assign(defaultStyles, attribute.value)
    }
  }

  const props: SlotProps = {
    ...input,
    attributes: [
      ...input.attributes.filter(
        (attribute) =>
          '__childAttribute' in attribute ||
          (!Predicate.isTagged(attribute, 'Class') && !Predicate.isTagged(attribute, 'Style')),
      ),
      h.Class(cn(...ownClasses, ...classes)),
      h.Style(defaultStyles),
    ],
  }

  return { props, ownClasses, classes, styles }
}

export function createSlotRenderer(h: H, inputs: CalendarViewInputs) {
  const render: (name: SlotName, initialInput: SlotProps) => Html = (
    name: SlotName,
    initialInput: SlotProps,
  ) => {
    const input = dropdownInput(h, name, initialInput)

    if (input === null) {
      return null
    }

    const { props, ownClasses, classes, styles } = slotPresentation(h, inputs, name, input)

    const defaultView: () => Html = () => {
      const { attributes, children, key } = props

      const div = () =>
        key === undefined ? h.div(attributes, children) : h.keyed('div')(key, attributes, children)

      return Match.value(name).pipe(
        Match.when('Chevron', () => {
          const orientation = props.orientation ?? 'left'

          const points = Match.value(orientation).pipe(
            Match.when('up', () => '6.77 17 12.5 11.43 18.24 17 20 15.28 12.5 8 5 15.28'),
            Match.when('down', () => '6.77 8 12.5 13.57 18.24 8 20 9.72 12.5 17 5 9.72'),
            Match.when(
              'left',
              () => '16 18.112 9.81111111 12 16 5.87733333 14.0888889 4 6 12 14.0888889 20',
            ),
            Match.orElse(
              () => '8 18.112 14.18888889 12 8 5.87733333 9.91111111 4 18 12 9.91111111 20',
            ),
          )

          return h.svg(
            [
              ...attributes,
              h.Width(String(props.iconSize ?? 24)),
              h.Height(String(props.iconSize ?? 24)),
              h.ViewBox('0 0 24 24'),
            ],
            [h.polygon([h.Points(points)])],
          ) satisfies Html
        }),
        Match.when('DayButton', () => h.button(attributes, children) satisfies Html),
        Match.whenOr(
          'PreviousMonthButton',
          'NextMonthButton',
          () => h.button(attributes, children) satisfies Html,
        ),
        Match.when(
          'Nav',
          () =>
            h.nav(
              [...attributes, h.AriaLabel(props.context.projection.navLabel)],
              children.length > 0
                ? children
                : ['previous', 'next'].map((direction) => {
                    const previous = direction === 'previous'

                    const target = previous
                      ? props.context.projection.previous
                      : props.context.projection.next

                    return props.context.render(
                      previous ? 'PreviousMonthButton' : 'NextMonthButton',
                      {
                        ...props,
                        attributes: [
                          h.Type('button'),
                          h.AriaLabel(
                            previous
                              ? props.context.projection.previousLabel
                              : props.context.projection.nextLabel,
                          ),
                          ...(target === null ? [h.AriaDisabled(true), h.Tabindex(-1)] : []),
                          h.OnClick(
                            props.context.request(
                              Action.cases.Navigated.make({
                                direction: previous ? 'previous' : 'next',
                              }),
                            ),
                          ),
                        ],
                        children: [
                          props.context.render('Chevron', {
                            ...props,
                            attributes: [],
                            children: [],
                            orientation: previous ? 'left' : 'right',
                          }),
                        ],
                      },
                    )
                  }),
            ) satisfies Html,
        ),
        Match.when('Option', () => h.option(attributes, children) satisfies Html),
        Match.when('Select', () => h.select(attributes, children) satisfies Html),
        Match.when(
          'CaptionLabel',
          () =>
            (key === undefined
              ? h.span(attributes, children)
              : h.keyed('span')(key, attributes, children)) satisfies Html,
        ),
        Match.when(
          'Weekday',
          () =>
            h.div(
              [
                ...attributes,
                h.Role('columnheader'),
                h.Class(
                  cn(
                    'flex h-[calc(var(--cell-size)*0.8)] items-center justify-center text-muted-foreground supports-[width:round(1px,1px)]:h-[round(down,calc(var(--cell-size)*0.8),1px)]',
                    inputs.fill ? 'min-w-0 flex-1' : 'w-[var(--cell-size)]',
                    typeClass('caption', inputs.compact ? 'compact' : 'default'),
                    ...ownClasses,
                    ...classes,
                  ),
                ),
              ],
              children,
            ) satisfies Html,
        ),
        Match.when(
          'WeekNumberHeader',
          () =>
            h.div(
              [
                ...attributes,
                h.Role('columnheader'),
                h.Class(cn('w-[calc(var(--cell-size)*0.75)] shrink-0', ...ownClasses, ...classes)),
              ],
              [],
            ) satisfies Html,
        ),
        Match.when('Weekdays', () => null satisfies Html),
        Match.when('Dropdown', () => {
          const { select } = props

          if (select === undefined) {
            return null satisfies Html
          }

          const selected = select.options.find((option) => String(option.value) === select.value)

          return h.span(
            [
              h.DataAttribute('disabled', String(props.context.projection.disableNavigation)),
              h.Class(inputs.classNames?.DropdownRoot ?? 'rdp-dropdown_root'),
              h.Style(inputs.styles?.DropdownRoot ?? {}),
            ],
            [
              props.context.render('Select', {
                ...props,
                attributes: [
                  ...attributes,
                  h.Value(select.value),
                  h.Disabled(props.context.projection.disableNavigation),
                  h.AriaLabel(select.label),
                  h.OnChange(select.request),
                ],
                children: select.options.map((option) =>
                  props.context.render('Option', {
                    ...props,
                    key: String(option.value),
                    attributes: [
                      h.Value(String(option.value)),
                      h.Disabled(option.disabled),
                      h.Selected(String(option.value) === select.value),
                    ],
                    children: [option.label],
                  }),
                ),
              }),
              h.span(
                [
                  h.Class(inputs.classNames?.CaptionLabel ?? 'rdp-caption_label'),
                  h.Style(inputs.styles?.CaptionLabel ?? {}),
                  h.AriaHidden(true),
                ],
                [
                  selected?.label ?? '',
                  props.context.render('Chevron', {
                    ...props,
                    attributes: [],
                    children: [],
                    orientation: 'down',
                    iconSize: 18,
                  }),
                ],
              ),
            ],
          ) satisfies Html
        }),
        Match.whenOr(
          'MonthsDropdown',
          'YearsDropdown',
          () => props.context.render('Dropdown', props) satisfies Html,
        ),
        Match.whenOr(
          'Root',
          'Months',
          'Month',
          'MonthCaption',
          'MonthGrid',
          'DropdownNav',
          'Footer',
          'Weeks',
          'Week',
          'Day',
          'WeekNumber',
          () => div() satisfies Html,
        ),
        Match.exhaustive,
      )
    }

    const override = inputs.renderComponent

    if (override === undefined || !hasCustomComponent(inputs, name)) {
      return defaultView()
    }

    const { attributes, context, select, sourceChildren, ...publicProps } = props

    const selectedProps =
      select === undefined
        ? publicProps
        : {
            ...publicProps,
            select: { value: select.value, label: select.label, options: select.options },
          }

    return override({
      name,
      props: {
        ...selectedProps,
        children: sourceChildren ?? publicProps.children,
        attributes: boundAttributes([
          ...attributes.filter(
            (attribute) =>
              '__childAttribute' in attribute ||
              (!Predicate.isTagged(attribute, 'Class') && !Predicate.isTagged(attribute, 'Style')),
          ),
          h.Class(cn(...classes)),
          h.Style(styles),
        ]),
        context: {
          calendar: context.calendar,
          projection: context.projection,
          selected: context.selected,
          visual: context.visual,
        },
      },
      defaultView,
      onClick: (action) => childAttributes([h.OnClick(context.request(action))]),
      render: (slot, children, options) =>
        render(slot, { ...props, ...options, attributes: [], children }),
    })
  }

  return render
}
