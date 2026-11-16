import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: Array<ClassValue>): string => twMerge(clsx(inputs))

export const joinClasses = (...parts: ReadonlyArray<string | false | undefined>): string =>
  parts.filter((part) => part !== undefined && part !== false && part !== '').join(' ')
