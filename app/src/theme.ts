import { resolveTheme, type Settings, type ResolvedTheme } from './settings'
/* @license Fluid Functionalism cc276ca0, registry/default/lib/theme-context.tsx. */
/* @license MIT, copyright 2026 Micka Touillaud. See registry/fluid/NOTICE */
export const themeTransitionStyles =
  '::view-transition-old(root),::view-transition-new(root){animation-duration:180ms;animation-timing-function:ease-in-out}'
export const suppressTransitionStyles = '*,*::before,*::after{transition:none!important}'
export const initialThemeScript = `(()=>{const p=new URLSearchParams(location.search);const t=p.get('theme');const d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('light',!d);document.documentElement.style.colorScheme=d?'dark':'light'})()`
export const shouldTransitionTheme = (
  before: Settings,
  after: Settings,
  previousKnown: boolean,
  known: boolean,
  previousSystem: ResolvedTheme = 'light',
  system: ResolvedTheme = 'light',
) =>
  (before.theme !== 'system' || previousKnown) &&
  (after.theme !== 'system' || known) &&
  resolveTheme(before, previousSystem) !== resolveTheme(after, system)
export const themeClass = (settings: Settings, systemTheme: ResolvedTheme, known: boolean) =>
  settings.theme === 'system' && !known
    ? 'system'
    : settings.theme === 'system'
      ? systemTheme
      : settings.theme
