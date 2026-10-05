export function element(selector, root = document) {
  const node = root.querySelector(selector);
  if (!node) throw new Error(`页面缺少元素：${selector}`);
  return node;
}

/** Catalogue text is escaped too, so future edited/imported data cannot create markup. */
export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export function listen(target, event, handler, signal) {
  target.addEventListener(event, handler, { signal });
}
