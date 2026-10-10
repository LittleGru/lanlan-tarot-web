const storageKey = 'moonlit-ai-invite';
let invite = '';
let pending = null;

export function hostedEndpoint(path, document = globalThis.document) {
  const configured = document.querySelector('meta[name="tarot-api-base"]')?.content;
  if (!configured) throw new Error('AI 服务地址尚未配置。');
  const base = new URL(configured);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
    throw new Error('AI 服务地址配置无效。');
  }
  return new URL(`/api/${path}`, base).href;
}

export function clearAIInvite() {
  invite = '';
  try { sessionStorage.removeItem(storageKey); } catch { /* Memory-only works without storage. */ }
  const button = globalThis.document?.querySelector('#ai-access-button');
  if (button) button.textContent = '开启 AI';
}

export async function requireAIInvite(signal) {
  if (invite) return invite;
  if (!pending) pending = new Promise(resolve => {
    const dialog = document.querySelector('#ai-access-dialog');
    dialog.showModal();
    document.querySelector('#ai-invite-code').focus();
    dialog.addEventListener('close', () => { pending = null; resolve(invite); }, { once: true });
  });
  const code = await pending;
  if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
  if (!code) throw new DOMException('已取消 AI 操作', 'AbortError');
  return code;
}

/** The invite unlocks the trial, never the OpenAI account or its API credential. */
export function mountAIAccess(document, signal) {
  const button = document.querySelector('#ai-access-button');
  const hosted = document.querySelector('meta[name="tarot-ai-mode"]')?.content === 'hosted-api';
  button.hidden = !hosted;
  if (!hosted) return;
  try { invite = sessionStorage.getItem(storageKey) ?? ''; } catch { /* Optional persistence. */ }
  const dialog = document.querySelector('#ai-access-dialog');
  const input = document.querySelector('#ai-invite-code');
  const message = document.querySelector('#ai-access-message');
  const submit = document.querySelector('#ai-access-submit');
  const updateButton = () => { button.textContent = invite ? 'AI 已开启' : '开启 AI'; };
  updateButton();
  button.addEventListener('click', () => { dialog.showModal(); input.focus(); }, { signal });
  document.querySelector('#ai-access-close').addEventListener('click', () => dialog.close(), { signal });
  document.querySelector('#ai-access-form').addEventListener('submit', async event => {
    event.preventDefault();
    const code = input.value.trim();
    if (!code) { message.textContent = '请填写邀请码。'; return; }
    submit.disabled = true;
    message.textContent = '正在验证…';
    try {
      const response = await fetch(hostedEndpoint('access', document), {
        method: 'POST', headers: { Authorization: `Bearer ${code}` },
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.accepted) throw new Error(result?.error ?? '暂时无法验证邀请码，请稍后再试。');
      invite = code;
      try { sessionStorage.setItem(storageKey, code); } catch { /* Optional persistence. */ }
      input.value = '';
      message.textContent = '';
      updateButton();
      dialog.close();
    } catch (error) {
      message.textContent = error.name === 'TypeError' ? '暂时无法连接 AI 服务，请稍后再试。' : error.message;
    } finally { submit.disabled = false; }
  }, { signal });
}
