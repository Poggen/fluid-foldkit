// Fluid's exact Untitled UI role adapter. No Untitled UI SVG data is distributed.
// Consumers supply licensed native glyph renderers; see NOTICE
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defaultIcons } from './icons.js'
import type { Icon, IconMap } from './presentation.js'

export interface UntitleduiGlyphOptions {
  readonly width: number | undefined
  readonly height: number | undefined
  readonly strokeWidth: number | undefined
  readonly className: string | undefined
}

export type UntitleduiGlyph = <Message>(
  options: UntitleduiGlyphOptions,
  h: HtmlBuilder<Message>,
) => Html

export interface UntitleduiGlyphs {
  readonly AlertCircle: UntitleduiGlyph
  readonly File01: UntitleduiGlyph
  readonly Minus: UntitleduiGlyph
  readonly ChevronRight: UntitleduiGlyph
  readonly ChevronDown: UntitleduiGlyph
  readonly Dropper: UntitleduiGlyph
  readonly XClose: UntitleduiGlyph
  readonly Copy01: UntitleduiGlyph
  readonly Menu01: UntitleduiGlyph
  readonly Circle: UntitleduiGlyph
  readonly Monitor01: UntitleduiGlyph
  readonly Sun: UntitleduiGlyph
  readonly Moon01: UntitleduiGlyph
  readonly Square: UntitleduiGlyph
  readonly BookClosed: UntitleduiGlyph
  readonly Clock: UntitleduiGlyph
  readonly Star01: UntitleduiGlyph
  readonly Settings01: UntitleduiGlyph
  readonly Plus: UntitleduiGlyph
  readonly ArrowLeft: UntitleduiGlyph
  readonly ArrowRight: UntitleduiGlyph
  readonly ArrowUp: UntitleduiGlyph
  readonly ArrowDown: UntitleduiGlyph
  readonly SearchMd: UntitleduiGlyph
  readonly Loading01: UntitleduiGlyph
  readonly Users01: UntitleduiGlyph
  readonly Lock01: UntitleduiGlyph
  readonly Mail01: UntitleduiGlyph
  readonly Bell01: UntitleduiGlyph
  readonly Shield01: UntitleduiGlyph
  readonly Palette: UntitleduiGlyph
  readonly Lightbulb01: UntitleduiGlyph
  readonly Rocket01: UntitleduiGlyph
  readonly Heart: UntitleduiGlyph
  readonly Brush01: UntitleduiGlyph
  readonly CpuChip01: UntitleduiGlyph
  readonly Globe01: UntitleduiGlyph
  readonly User01: UntitleduiGlyph
  readonly Image01: UntitleduiGlyph
  readonly Link01: UntitleduiGlyph
  readonly Check: UntitleduiGlyph
  readonly RefreshCcw01: UntitleduiGlyph
  readonly Home01: UntitleduiGlyph
  readonly MessageCircle01: UntitleduiGlyph
  readonly Inbox01: UntitleduiGlyph
  readonly Pencil01: UntitleduiGlyph
  readonly Scale01: UntitleduiGlyph
  readonly SkipForward: UntitleduiGlyph
  readonly CornerDownRight: UntitleduiGlyph
  readonly CornerDownLeft: UntitleduiGlyph
  readonly LayoutLeft: UntitleduiGlyph
  readonly LayoutRight: UntitleduiGlyph
  readonly ChevronSelectorVertical: UntitleduiGlyph
  readonly DotsHorizontal: UntitleduiGlyph
  readonly DotsVertical: UntitleduiGlyph
  readonly Calendar: UntitleduiGlyph
  readonly Folder: UntitleduiGlyph
  readonly Sliders01: UntitleduiGlyph
  readonly InfoCircle: UntitleduiGlyph
}

function adapt(glyph: UntitleduiGlyph): Icon {
  return (options, h) =>
    glyph(
      {
        width: options.size,
        height: options.size,
        strokeWidth: options.strokeWidth,
        className: options.className,
      },
      h,
    )
}

/** Native consumer-owned glyphs are required; no substitute family is selected. */
export function createUntitleduiIcons(glyphs: UntitleduiGlyphs): IconMap {
  return {
    'chevron-right': adapt(glyphs.ChevronRight),
    'chevron-down': adapt(glyphs.ChevronDown),
    pipette: adapt(glyphs.Dropper),
    x: adapt(glyphs.XClose),
    copy: adapt(glyphs.Copy01),
    menu: adapt(glyphs.Menu01),
    dot: adapt(glyphs.Circle),
    monitor: adapt(glyphs.Monitor01),
    sun: adapt(glyphs.Sun),
    moon: adapt(glyphs.Moon01),
    'rectangle-horizontal': adapt(glyphs.Square),
    circle: adapt(glyphs.Circle),
    'square-library': adapt(glyphs.BookClosed),
    clock: adapt(glyphs.Clock),
    star: adapt(glyphs.Star01),
    settings: adapt(glyphs.Settings01),
    plus: adapt(glyphs.Plus),
    'arrow-left': adapt(glyphs.ArrowLeft),
    'arrow-right': adapt(glyphs.ArrowRight),
    'arrow-up': adapt(glyphs.ArrowUp),
    'arrow-down': adapt(glyphs.ArrowDown),
    search: adapt(glyphs.SearchMd),
    loader: adapt(glyphs.Loading01),
    users: adapt(glyphs.Users01),
    lock: adapt(glyphs.Lock01),
    mail: adapt(glyphs.Mail01),
    bell: adapt(glyphs.Bell01),
    shield: adapt(glyphs.Shield01),
    palette: adapt(glyphs.Palette),
    lightbulb: adapt(glyphs.Lightbulb01),
    rocket: adapt(glyphs.Rocket01),
    heart: adapt(glyphs.Heart),
    paintbrush: adapt(glyphs.Brush01),
    brain: adapt(glyphs.CpuChip01),
    globe: adapt(glyphs.Globe01),
    user: adapt(glyphs.User01),
    image: adapt(glyphs.Image01),
    link: adapt(glyphs.Link01),
    check: adapt(glyphs.Check),
    'rotate-ccw': adapt(glyphs.RefreshCcw01),
    home: adapt(glyphs.Home01),
    'message-circle': adapt(glyphs.MessageCircle01),
    inbox: adapt(glyphs.Inbox01),
    pencil: adapt(glyphs.Pencil01),
    scaling: adapt(glyphs.Scale01),
    'skip-forward': adapt(glyphs.SkipForward),
    'corner-down-right': adapt(glyphs.CornerDownRight),
    'corner-down-left': adapt(glyphs.CornerDownLeft),
    'panel-left': adapt(glyphs.LayoutLeft),
    'panel-right': adapt(glyphs.LayoutRight),
    'chevrons-up-down': adapt(glyphs.ChevronSelectorVertical),
    'more-horizontal': adapt(glyphs.DotsHorizontal),
    'more-vertical': adapt(glyphs.DotsVertical),
    calendar: adapt(glyphs.Calendar),
    folder: adapt(glyphs.Folder),
    'sliders-horizontal': adapt(glyphs.Sliders01),
    info: adapt(glyphs.InfoCircle),
    square: adapt(glyphs.Square),
    'circle-alert': adapt(glyphs.AlertCircle),
    file: adapt(glyphs.File01),
    minus: adapt(glyphs.Minus),
    play: defaultIcons.play,
    pause: defaultIcons.pause,
  }
}
