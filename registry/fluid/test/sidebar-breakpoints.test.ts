import { expect, it } from 'vitest'
import { sidebarBreakpointClasses } from '../src/sidebar-breakpoints.js'

it.each([640, 768, 1024, 1280])(
  'keeps breakpoint %i visible on first paint without an entrance fade',
  (breakpoint) => {
    const initial = sidebarBreakpointClasses(breakpoint, false)
    expect(initial).toContain('hidden')
    expect(initial).not.toContain('duration-')
    expect(initial).not.toContain('starting:')
    const mounted = sidebarBreakpointClasses(breakpoint, false, true)
    expect(mounted).toContain('transition-[opacity,display]')
    expect(mounted).toContain('duration-160')
    expect(mounted).toContain('duration-240')
  },
)
