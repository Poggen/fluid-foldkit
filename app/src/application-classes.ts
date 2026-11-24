export const applicationClasses = {
  root: 'group/sidebar-wrapper relative flex min-h-svh w-full min-h-screen [&:has([data-not-found])_[data-site-right-panel]]:hidden',
  ramkaGalleryLayout: [
    'flex flex-col gap-8 px-6',
    '[@media_screen]:[&_.component-reference>section[aria-label="API_reference"]]:[contain-intrinsic-block-size:auto_none]',
    '[@media_screen]:data-[gallery-layout=measured]:[&:not([data-gallery-measuring])_.component-reference>section[aria-label="API_reference"]:not(:focus-within)]:[content-visibility:auto]',
  ].join(' '),
  pageHeading: 'w-full max-w-[680px] mx-auto py-20 sm:py-28 px-6',
  displayHeading: 'text-site-display text-foreground leading-none',
  skipLink:
    'fixed top-2 left-[50%] [transform:translate(-50%,_-150%)] z-200 bg-card pt-2 pr-4 pb-2 pl-4 border border-border [&:focus]:[transform:translate(-50%,_0)]',
  mobileTopbar:
    'xl:hidden fixed top-4 left-4 z-[calc(var(--z-sticky,30)+1)] bg-background/70 backdrop-blur-md',
  navigation:
    'peer flex shrink-0 flex-col sticky top-0 h-svh overflow-hidden max-xl:hidden ml-2 site-navigation',
  customizer:
    'shrink-0 overflow-hidden sticky top-4 self-start mt-4 xl-fade-block max-xl:pointer-events-none site-customizer',
  credit: 'fixed bottom-4 right-4 h-8 w-64 grid gap-3 text-[10px] text-muted-foreground [&_a]:mt-1',
  fontStatus:
    'fixed bottom-4 right-4 z-80 max-w-[360px] bg-background border border-border pt-3 pr-3 pb-3 pl-3 [&_button]:ml-2 [&_button]:underline',
}
