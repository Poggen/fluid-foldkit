import { createPresentationContext, resolvePresentation } from './presentation.js'
import type { PresentationContext } from './presentation.js'
import type { DialogProps } from './dialog-contracts.js'

/** Resolve child presentation before handing parent-owned content to a Dialog callback. */
export function createDialogContentContext(
  props: Pick<DialogProps, 'context' | 'shape' | 'surface' | 'size' | 'presentation'>,
): PresentationContext {
  const { size: _contentWidth, ...inherited } = props
  const presentation = { ...inherited, ...props.presentation }
  const resolved = resolvePresentation(presentation)

  return createPresentationContext({ ...presentation, surface: Math.min(resolved.surface + 4, 8) })
}
