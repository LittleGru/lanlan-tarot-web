import { element } from './dom.js?v=5cfbefc47f66';

/** One explicit decision; Escape and the secondary button always preserve the current work. */
export function confirmAction({ title, message, confirmLabel = '继续', cancelLabel = '取消' }) {
  const dialog = element('#action-confirm-dialog');
  if (dialog.open) return Promise.resolve(false);
  element('#action-confirm-title').textContent = title;
  element('#action-confirm-message').textContent = message;
  const accept = element('#action-confirm-accept');
  const cancel = element('#action-confirm-cancel');
  accept.textContent = confirmLabel;
  cancel.textContent = cancelLabel;
  return new Promise(resolve => {
    const listeners = new AbortController();
    let accepted = false;
    accept.addEventListener('click', () => { accepted = true; dialog.close(); }, { signal: listeners.signal });
    cancel.addEventListener('click', () => dialog.close(), { signal: listeners.signal });
    dialog.addEventListener('close', () => { listeners.abort(); resolve(accepted); }, { once: true });
    dialog.showModal();
    cancel.focus();
  });
}
