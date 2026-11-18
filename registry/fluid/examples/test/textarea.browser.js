JSON.stringify(
  (() => {
    const textarea = document.querySelector('#docs-feedback')

    if (!(textarea instanceof HTMLTextAreaElement)) {
      throw new Error('Textarea failed to mount')
    }

    if (document.querySelectorAll('textarea').length !== 5) {
      throw new Error('Textarea page did not finish rendering')
    }

    if (textarea.type !== 'textarea' || textarea.hasAttribute('type')) {
      throw new Error('Input-only type leaked onto textarea')
    }

    const label = document.querySelector('label[for="docs-feedback"]')

    if (!(label instanceof HTMLLabelElement) || label.textContent !== 'Feedback') {
      throw new Error('Textarea lost its associated label')
    }

    const ids = (textarea.getAttribute('aria-describedby') ?? '')
      .split(' ')
      .filter((id) => id !== '')

    if (
      !ids.some(
        (id) =>
          document.querySelector(`#${CSS.escape(id)}`)?.textContent === 'It grows with your text.',
      )
    ) {
      throw new Error('Textarea lost its live description')
    }

    const dimensions = (() => {
      const compact = new URLSearchParams(location.search).get('size') === 'compact'
      const minimum = compact ? 64 : 76
      const maximum = compact ? 190 : 216
      const { height } = textarea.getBoundingClientRect()
      const lines = textarea.value.split('\n').length
      const contentSizing = CSS.supports('field-sizing', 'content')

      if (textarea.value === '' && Math.abs(height - minimum) >= 1) {
        throw new Error(`Unexpected empty textarea height ${height}`)
      }

      if (contentSizing && lines === 6 && height <= minimum) {
        throw new Error('Textarea did not grow with trusted multiline input')
      }

      if (contentSizing && lines >= 20 && Math.abs(height - maximum) >= 1) {
        throw new Error(`Textarea did not stop at ten lines: ${height}`)
      }

      if (!contentSizing && Math.abs(height - minimum) >= 1) {
        throw new Error('Textarea fallback lost its minimum height')
      }

      if (lines >= 20 && textarea.scrollHeight <= textarea.clientHeight) {
        throw new Error('Long textarea content cannot scroll')
      }

      return { height, lines, contentSizing }
    })()

    const disabled = document.querySelector('#docs-comment')

    if (!(disabled instanceof HTMLTextAreaElement) || !disabled.disabled) {
      throw new Error('Disabled textarea became editable')
    }

    return { ...dimensions, label: label.textContent, descriptionIds: ids }
  })(),
)
