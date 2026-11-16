export const systemClasses = {
  pair: 'grid w-full gap-5 sm:grid-cols-2',
  comparisonSide: 'flex flex-col items-center gap-3',
  heading: 'text-site-title text-foreground leading-none',
  genericMenu: 'relative flex w-full flex-col p-2',
  folderCount: 'text-site-caption tabular-nums text-muted-foreground',
  genericCopy:
    'flex h-9 w-full max-w-[240px] items-center gap-1 border border-border bg-background pl-3 pr-1',
  genericControl:
    'h-9 px-3 text-site-body text-muted-foreground [&:is(:hover,[data-script-hover])]:bg-muted/60',
  genericMenuRow:
    'relative z-10 flex h-9 w-full shrink-0 items-center gap-2 px-3 text-left text-site-body text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]',
  genericCopyAction:
    'flex h-7 shrink-0 items-center gap-1.5 px-1.5 text-site-caption text-muted-foreground [&:is(:hover,[data-script-hover])]:text-foreground',
  skillButtons: 'flex w-full flex-col items-center gap-4',
  typeSpecimen: 'flex min-w-0 flex-col items-center gap-3',
  typeCaption:
    'flex items-center justify-center gap-2 text-center text-site-caption text-muted-foreground',
  tableScroll: 'size-full rounded-[inherit] overflow-x-auto scroll-fade-x',
  table:
    'w-full border-collapse text-site-body tabular-nums [&_th:first-child]:pl-0 [&_td:first-child]:pl-0',
  headerCell: 'px-3 py-2 text-left text-foreground',
  cell: 'px-3 py-2 text-muted-foreground',
  trimChip: 'relative inline-flex bg-[var(--tint)] p-2 text-foreground',
}
