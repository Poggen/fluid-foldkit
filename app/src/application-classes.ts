export const applicationClasses = {
  root: 'group/sidebar-wrapper relative flex min-h-svh w-full min-h-screen [&:has([data-not-found])_[data-site-right-panel]]:hidden',
  pageHeading: 'w-full max-w-[680px] mx-auto py-20 sm:py-28 px-6',
  displayHeading: 'text-site-display text-foreground leading-none',
  skipLink:
    'fixed top-2 left-[50%] [transform:translate(-50%,_-150%)] z-200 bg-card pt-2 pr-4 pb-2 pl-4 border border-border [&:focus]:[transform:translate(-50%,_0)]',
  mobileTopbar:
    'xl:hidden fixed top-4 left-4 z-[calc(var(--z-sticky,30)+1)] bg-background/70 backdrop-blur-md',
  navigation: 'peer shrink-0 sticky top-0 h-svh overflow-hidden max-xl:hidden ml-2 site-navigation',
  customizer:
    'shrink-0 overflow-hidden sticky top-4 self-start mt-4 xl-fade-block max-xl:pointer-events-none site-customizer',
  credit: 'mt-auto pt-8 grid gap-3 text-[10px] text-muted-foreground [&_a]:mt-1',
  fontStatus:
    'fixed bottom-4 right-4 z-80 max-w-[360px] bg-background border border-border pt-3 pr-3 pb-3 pl-3 [&_button]:ml-2 [&_button]:underline',
}
