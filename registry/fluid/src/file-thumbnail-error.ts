// Derived from Fluid Functionalism 200b4534. MIT, copyright 2026 Micka Touillaud.
import { Schema } from 'effect'

export class PdfPreviewError extends Schema.TaggedError<
  PdfPreviewError,
  { readonly brand: unique symbol }
>()('PdfPreviewError', { message: Schema.String }) {}
