// SVG data: Lucide 0.564.0 (ISC; Feather-derived portions MIT).
// See NOTICE
import type { Icon } from './presentation.js'
import { ChevronRight } from './icons/chevron-right.js'
import { ChevronDown } from './icons/chevron-down.js'
import { Pipette } from './icons/pipette.js'
import { X } from './icons/x.js'
import { Copy } from './icons/copy.js'
import { Menu } from './icons/menu.js'
import { Dot } from './icons/dot.js'
import { Monitor } from './icons/monitor.js'
import { Sun } from './icons/sun.js'
import { Moon } from './icons/moon.js'
import { RectangleHorizontal } from './icons/rectangle-horizontal.js'
import { Circle } from './icons/circle.js'
import { Square } from './icons/square.js'
import { SquareLibrary } from './icons/square-library.js'
import { Clock } from './icons/clock.js'
import { Star } from './icons/star.js'
import { Settings } from './icons/settings.js'
import { Plus } from './icons/plus.js'
import { ArrowLeft } from './icons/arrow-left.js'
import { ArrowRight } from './icons/arrow-right.js'
import { ArrowUp } from './icons/arrow-up.js'
import { ArrowDown } from './icons/arrow-down.js'
import { Search } from './icons/search.js'
import { Loader } from './icons/loader.js'
import { Users } from './icons/users.js'
import { Lock } from './icons/lock.js'
import { Mail } from './icons/mail.js'
import { Bell } from './icons/bell.js'
import { Shield } from './icons/shield.js'
import { Palette } from './icons/palette.js'
import { Lightbulb } from './icons/lightbulb.js'
import { Rocket } from './icons/rocket.js'
import { Heart } from './icons/heart.js'
import { Paintbrush } from './icons/paintbrush.js'
import { Brain } from './icons/brain.js'
import { Globe } from './icons/globe.js'
import { User } from './icons/user.js'
import { ImageIcon } from './icons/image.js'
import { Link } from './icons/link.js'
import { Check } from './icons/check.js'
import { RotateCcw } from './icons/rotate-ccw.js'
import { Play } from './icons/play.js'
import { Pause } from './icons/pause.js'
import { Home } from './icons/home.js'
import { MessageCircle } from './icons/message-circle.js'
import { Inbox } from './icons/inbox.js'
import { Pencil } from './icons/pencil.js'
import { Scaling } from './icons/scaling.js'
import { SkipForward } from './icons/skip-forward.js'
import { CornerDownRight } from './icons/corner-down-right.js'
import { CornerDownLeft } from './icons/corner-down-left.js'
import { PanelLeft } from './icons/panel-left.js'
import { PanelRight } from './icons/panel-right.js'
import { ChevronsUpDown } from './icons/chevrons-up-down.js'
import { Ellipsis } from './icons/more-horizontal.js'
import { EllipsisVertical } from './icons/more-vertical.js'
import { Calendar } from './icons/calendar.js'
import { Folder } from './icons/folder.js'
import { SlidersHorizontal } from './icons/sliders-horizontal.js'
import { Info } from './icons/info.js'
import { CircleAlert } from './icons/circle-alert.js'
import { File } from './icons/file.js'
import { Minus } from './icons/minus.js'

export type IconName =
  | 'chevron-right'
  | 'chevron-down'
  | 'x'
  | 'copy'
  | 'menu'
  | 'dot'
  | 'monitor'
  | 'sun'
  | 'moon'
  | 'rectangle-horizontal'
  | 'circle'
  | 'square'
  | 'square-library'
  | 'clock'
  | 'star'
  | 'settings'
  | 'plus'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'arrow-down'
  | 'search'
  | 'loader'
  | 'users'
  | 'lock'
  | 'mail'
  | 'bell'
  | 'shield'
  | 'palette'
  | 'lightbulb'
  | 'rocket'
  | 'heart'
  | 'paintbrush'
  | 'brain'
  | 'globe'
  | 'user'
  | 'image'
  | 'link'
  | 'check'
  | 'rotate-ccw'
  | 'play'
  | 'pause'
  | 'pipette'
  | 'home'
  | 'message-circle'
  | 'inbox'
  | 'pencil'
  | 'scaling'
  | 'skip-forward'
  | 'corner-down-right'
  | 'corner-down-left'
  | 'panel-left'
  | 'panel-right'
  | 'chevrons-up-down'
  | 'more-horizontal'
  | 'more-vertical'
  | 'calendar'
  | 'folder'
  | 'sliders-horizontal'
  | 'info'
  | 'circle-alert'
  | 'file'
  | 'minus'

export const defaultIcons: Record<IconName, Icon> = {
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  pipette: Pipette,
  x: X,
  copy: Copy,
  menu: Menu,
  dot: Dot,
  monitor: Monitor,
  sun: Sun,
  moon: Moon,
  'rectangle-horizontal': RectangleHorizontal,
  circle: Circle,
  square: Square,
  'square-library': SquareLibrary,
  clock: Clock,
  star: Star,
  settings: Settings,
  plus: Plus,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'arrow-down': ArrowDown,
  search: Search,
  loader: Loader,
  users: Users,
  lock: Lock,
  mail: Mail,
  bell: Bell,
  shield: Shield,
  palette: Palette,
  lightbulb: Lightbulb,
  rocket: Rocket,
  heart: Heart,
  paintbrush: Paintbrush,
  brain: Brain,
  globe: Globe,
  user: User,
  image: ImageIcon,
  link: Link,
  check: Check,
  'rotate-ccw': RotateCcw,
  play: Play,
  pause: Pause,
  home: Home,
  'message-circle': MessageCircle,
  inbox: Inbox,
  pencil: Pencil,
  scaling: Scaling,
  'skip-forward': SkipForward,
  'corner-down-right': CornerDownRight,
  'corner-down-left': CornerDownLeft,
  'panel-left': PanelLeft,
  'panel-right': PanelRight,
  'chevrons-up-down': ChevronsUpDown,
  'more-horizontal': Ellipsis,
  'more-vertical': EllipsisVertical,
  calendar: Calendar,
  folder: Folder,
  'sliders-horizontal': SlidersHorizontal,
  info: Info,
  'circle-alert': CircleAlert,
  file: File,
  minus: Minus,
}

export const resolveIcons = (
  overrides: Partial<Record<IconName, Icon>> = {},
): Record<IconName, Icon> => ({ ...defaultIcons, ...overrides })
