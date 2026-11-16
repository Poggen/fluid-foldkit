import { Schema } from 'effect'
export const documentationFields = {
  isDocEmbedded: Schema.Boolean,
  docShape: Schema.Literals(['sharp', 'rounded', 'pill']),
  docSize: Schema.Literals(['default', 'compact']),
  docHover: Schema.Literals(['fluid', 'standard']),
}

export const documentationInMessages = {
  InformedOfDocumentation: {
    embedded: Schema.Boolean,
    shape: documentationFields.docShape,
    size: documentationFields.docSize,
    hoverMode: documentationFields.docHover,
  },
}
export const documentationDefaults = {
  isDocEmbedded: false,
  docShape: 'rounded',
  docSize: 'default',
  docHover: 'fluid',
} as const
