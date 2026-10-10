import { escapeHTML as html } from './dom.js?v=c1a3470ea381';

export function renderTextList(items) {
  return `<ul class="ai-list">${items.map(item => `<li>${html(item)}</li>`).join('')}</ul>`;
}

export function setAIState({ button, message, result }, state, error = '') {
  const busy = state === 'loading';
  button.disabled = busy;
  button.setAttribute('aria-busy', String(busy));
  message.textContent = busy ? '正在整理反馈，请稍候…' : error;
  message.dataset.state = error ? 'error' : state;
  result.hidden = true;
  result.replaceChildren();
}

export function createLatestRequest(lifetime) {
  let current;
  return {
    cancel() { current?.abort(); current = undefined; },
    start() {
      current?.abort();
      current = new AbortController();
      return AbortSignal.any([lifetime, current.signal]);
    },
  };
}
