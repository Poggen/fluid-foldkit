/* @license Derived from Fluid Functionalism cc276ca0. MIT, copyright 2026 Micka Touillaud. */
export function inputBackground(
  disabled: boolean,
  _error: boolean,
  focused: boolean,
  active: boolean,
) {
  return !disabled && !focused && active ? 'bg-hover' : 'bg-transparent'
}
export function inputRing(disabled: boolean, error: boolean, focused: boolean, _active: boolean) {
  if (focused && !disabled) return 'ring-foreground/40'
  return error ? 'ring-destructive/50' : 'ring-border'
}
