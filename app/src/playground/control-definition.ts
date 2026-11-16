export type Control<Property extends string = string> = { readonly enabled?: boolean } & (
  | {
      readonly kind: 'choice'
      readonly prop: Property
      readonly label?: string
      readonly group?: string
      readonly values: ReadonlyArray<string | number>
      readonly initial: string | number
    }
  | {
      readonly kind: 'toggle'
      readonly prop: Property
      readonly label?: string
      readonly group?: string
      readonly initial: boolean
    }
  | {
      readonly kind: 'text'
      readonly prop: Property
      readonly label?: string
      readonly group?: string
      readonly initial: string
      readonly values: ReadonlyArray<string>
    }
  | {
      readonly kind: 'number'
      readonly prop: Property
      readonly label?: string
      readonly group?: string
      readonly initial: number
      readonly min: number
      readonly max: number
      readonly step: number
    }
)
