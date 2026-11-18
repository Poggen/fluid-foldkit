/** Hydration has not started; preserve the server document and its native links. */
export const showStartupFailure = (document: Document, retry: () => void) => {
  const notice = document.createElement('div')
  notice.setAttribute('role', 'alert')
  notice.setAttribute('data-startup-failure', '')
  notice.className =
    'fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-4 text-foreground shadow-lg'
  const message = document.createElement('p')
  message.textContent = 'Interactive controls could not load. You can still browse the page.'
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = 'Reload page'
  button.className = 'rounded border border-border px-3 py-2 font-medium underline'
  button.addEventListener('click', retry)
  notice.append(message, button)
  document.body.append(notice)
}
