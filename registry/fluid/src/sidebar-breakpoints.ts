const hidden: Readonly<Record<number, string>> = {
  640: 'max-sm:hidden max-sm:opacity-0',
  768: 'max-md:hidden max-md:opacity-0',
  1024: 'max-lg:hidden max-lg:opacity-0',
  1280: 'max-xl:hidden max-xl:opacity-0',
}
const fade: Readonly<Record<number, string>> = {
  640: 'max-sm:duration-160 sm:duration-240 sm:starting:opacity-0',
  768: 'max-md:duration-160 md:duration-240 md:starting:opacity-0',
  1024: 'max-lg:duration-160 lg:duration-240 lg:starting:opacity-0',
  1280: 'max-xl:duration-160 xl:duration-240 xl:starting:opacity-0',
}
export function sidebarBreakpointClasses(breakpoint: number, mobile: boolean, mounted = false) {
  return [
    hidden[breakpoint] ?? (mobile ? 'hidden' : ''),
    ...(mounted
      ? [
          'transition-[opacity,display] ease-out [transition-behavior:allow-discrete] motion-reduce:transition-none',
          fade[breakpoint] ?? '',
        ]
      : []),
  ].join(' ')
}
