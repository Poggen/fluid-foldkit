import { Schema } from 'effect'

export const PreviewBand = Schema.Struct({ from: Schema.Int, to: Schema.Int })

export const DropdownItem = Schema.Struct({
  value: Schema.Int,
  label: Schema.String,
  disabled: Schema.Boolean,
  month: Schema.Finite,
})

export const CaptionDropdowns = Schema.Struct({
  date: Schema.Finite,
  monthOptions: Schema.Array(DropdownItem),
  yearOptions: Schema.Array(DropdownItem),
  monthText: Schema.String,
  yearText: Schema.String,
  monthDropdownLabel: Schema.String,
  yearDropdownLabel: Schema.String,
  selectedMonth: Schema.Int,
  selectedYear: Schema.Int,
})

export const PresentationProjectionFields = {
  disableNavigation: Schema.Boolean,
  navLabel: Schema.String,
  dir: Schema.NullOr(Schema.Literals(['ltr', 'rtl', 'auto'])),
  lang: Schema.NullOr(Schema.String),
  outsideHidden: Schema.Boolean,
  preview: Schema.Struct({
    band: Schema.NullOr(PreviewBand),
    previewEnd: Schema.NullOr(Schema.Int),
  }),
  dropdowns: Schema.Array(CaptionDropdowns),
  captionLayout: Schema.Literals(['label', 'dropdown', 'dropdown-months', 'dropdown-years']),
  monthYearOrder: Schema.Literals(['year-first', 'month-first']),
}

export const PresentationProjection = Schema.Struct(PresentationProjectionFields)

export type PresentationProjection = typeof PresentationProjection.Type
