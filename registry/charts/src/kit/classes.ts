import type { ClassValue } from 'clsx'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn: (...inputs: Array<ClassValue>) => string = (...inputs: Array<ClassValue>) =>
  twMerge(clsx(inputs))

export const joinClasses: (...parts: ReadonlyArray<string | false | undefined>) => string = (
  ...parts: ReadonlyArray<string | false | undefined>
) => parts.filter((part) => part !== undefined && part !== false && part !== '').join(' ')
