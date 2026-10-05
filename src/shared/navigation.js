import { element, listen } from './dom.js?v=2fc853de6c13';

const PAGES = new Set(['draw', 'learn', 'practice', 'guide']);

export function createNavigation({ onEnter, signal }) {
  function show(page) {
    if (!PAGES.has(page)) throw new Error('未知页面');
    document.querySelectorAll('.page').forEach(node => {
      node.classList.toggle('active', node.id === page);
    });
    document.querySelectorAll('.nav [data-tab]').forEach(node => {
      node.classList.toggle('active', node.dataset.tab === page);
    });
    onEnter(page);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  listen(document, 'click', event => {
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    event.preventDefault();
    show(button.dataset.tab);
  }, signal);
  listen(element('.brand'), 'click', event => {
    event.preventDefault();
    show('draw');
  }, signal);

  return { show };
}
