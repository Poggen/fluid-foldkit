/** Buffer startup input until Foldkit owns the controls and their state. */
export const earlyInputHead = `<script>
(() => {
  let pending;
  const edits = new Map();
  const pendingClasses = [
    '[&_button:focus]:cursor-progress',
    '[&_button:focus]:[outline:2px_solid_var(--fluid-accent,currentColor)]',
    '[&_button:focus]:outline-offset-2',
  ];
  const root = document.documentElement;
  const clearPending = () => {
    pending = undefined;
    root.removeAttribute('data-showcase-input-pending');
    root.classList.remove(...pendingClasses);
  };
  const abandonOutside = (event) => {
    if (pending === undefined) return;
    const target = document.getElementById(pending.id);
    if (!(event.target instanceof Node) || !target?.contains(event.target)) clearPending();
  };
  const capture = (event) => {
    if (event.type === 'keydown' && event.key === 'Escape') {
      clearPending();
      return;
    }
    if (
      event.defaultPrevented || event.metaKey || event.ctrlKey ||
      event.altKey || event.shiftKey
    ) return;
    if (event.type === 'click' && event.button !== 0) return;
    const target = event.target instanceof Element
      ? event.target.closest('button[id]')
      : null;
    if (
      !target || target.disabled || target.type !== 'button' ||
      !target.closest('[data-app="visuals"]')
    ) return;
    const preference = target.matches('[role="combobox"]') &&
      /^customize-(desktop|mobile)-(theme|accent|font|weight|shape|size|hover)-select-trigger$/.test(target.id);
    if (target.id !== 'site-menu-button' && !preference) return;
    if (
      event.type === 'keydown' &&
      (!preference || !['ArrowDown', 'ArrowUp'].includes(event.key))
    ) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    pending = {
      id: target.id,
      type: event.type,
      key: event.key,
      detail: event.detail,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    root.setAttribute('data-showcase-input-pending', '');
    root.classList.add(...pendingClasses);
  };
  const captureEdit = (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.disabled || target.readOnly) return;
    if (!target.matches('input[data-playground-editable]')) return;
    const rail = target.closest('[data-playground-controls-path]');
    const path = rail?.getAttribute('data-playground-controls-path');
    if (!path || path !== location.pathname || !target.id) return;
    edits.set(path + ':' + target.id, {
      path,
      id: target.id,
      prop: target.getAttribute('data-playground-editable'),
      value: target.value,
      start: target.selectionStart,
      end: target.selectionEnd,
    });
  };
  const dispose = () => {
    delete window.__releaseShowcaseInput;
    delete window.__cancelShowcaseInput;
    document.removeEventListener('input', captureEdit, true);
    document.removeEventListener('click', capture, true);
    document.removeEventListener('keydown', capture, true);
    document.removeEventListener('pointerdown', abandonOutside, true);
    document.removeEventListener('focusin', abandonOutside, true);
    clearPending();
  };
  document.addEventListener('input', captureEdit, true);
  document.addEventListener('click', capture, true);
  document.addEventListener('keydown', capture, true);
  document.addEventListener('pointerdown', abandonOutside, true);
  document.addEventListener('focusin', abandonOutside, true);
  window.__cancelShowcaseInput = dispose;
  window.__releaseShowcaseInput = () => {
    const input = pending;
    const drafts = Array.from(edits.values());
    dispose();
    for (const draft of drafts) {
      const target = document.getElementById(draft.id);
      if (
        draft.path !== location.pathname || !(target instanceof HTMLInputElement) ||
        target.disabled || target.readOnly || target.getAttribute('data-playground-editable') !== draft.prop ||
        target.closest('[data-playground-controls-path]')?.getAttribute('data-playground-controls-path') !== draft.path
      ) continue;
      target.value = draft.value;
      if (target === document.activeElement && draft.start !== null && draft.end !== null)
        target.setSelectionRange(draft.start, draft.end);
      target.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (input !== undefined) {
      const target = document.getElementById(input.id);
      if (
        !(target instanceof HTMLButtonElement) || target.disabled ||
        !target.closest('[data-app="visuals"]')
      ) return;
      target.focus({ preventScroll: true });
      const event = input.type === 'click'
        ? new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            detail: input.detail,
            clientX: input.clientX,
            clientY: input.clientY,
          })
        : new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: input.key,
          });
      target.dispatchEvent(event);
    }
  };
})()
</script>`

declare global {
  interface Window {
    __releaseShowcaseInput?: () => void
    __cancelShowcaseInput?: () => void
  }
}

/** Called by the initial presentation command, after Foldkit's boot and DOM commit. */
export const releaseEarlyInput = (window: Window) => {
  if (window.__releaseShowcaseInput === undefined) return
  window.requestAnimationFrame(() => window.__releaseShowcaseInput?.())
}

/** Failed bootstrap must discard queued input and stop intercepting native events. */
export const cancelEarlyInput = (window: Window) => window.__cancelShowcaseInput?.()
