export const formPreviewClass = (
  family: 'input' | 'textarea' | 'checkbox',
  title: string,
): string => {
  switch (family) {
    case 'input': {
      if (title === 'With a button') {
        return 'w-full max-w-sm'
      }

      if (title === 'Types') {
        return 'flex w-full max-w-xs flex-col gap-3'
      }

      return 'w-full max-w-xs'
    }

    case 'textarea': {
      if (title === 'With a button') {
        return 'flex w-full max-w-sm flex-col gap-2'
      }

      return 'w-full max-w-sm'
    }

    case 'checkbox': {
      if (title === 'Basic') {
        return 'w-auto'
      }

      if (title === 'Invalid and disabled') {
        return 'flex w-full max-w-xs flex-col gap-5'
      }

      return 'w-full max-w-xs'
    }

    default: {
      return 'w-full max-w-xs'
    }
  }
}

export const fieldPreviewClass = (title: string): string => {
  if (title === 'Horizontal') {
    return 'w-full max-w-md'
  }

  if (title === 'Validation and errors') {
    return 'flex w-full max-w-sm flex-col gap-4'
  }

  return 'w-full max-w-sm'
}

export const formRouteShape = (value: string | null): 'pill' | 'sharp' | 'rounded' => {
  if (value === null) {
    return 'rounded'
  }

  switch (value) {
    case 'pill': {
      return 'pill'
    }

    case 'sharp': {
      return 'sharp'
    }

    default: {
      return 'rounded'
    }
  }
}

export const formRouteFamily = (path: string): 'input' | 'textarea' | 'checkbox' => {
  if (path.includes('textarea')) {
    return 'textarea'
  }

  if (path.includes('checkbox')) {
    return 'checkbox'
  }

  return 'input'
}
