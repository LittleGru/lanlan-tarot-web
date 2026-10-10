import { element, listen } from './dom.js?v=5cfbefc47f66';
import { createPageRouter, PAGE_TITLES } from '../core/routing.js?v=5cfbefc47f66';

export function createNavigation({ onEnter, signal }) {
  window.history.scrollRestoration = 'manual';
  const positions = new Map();
  let currentPage;
  function render(page) {
    if (currentPage) positions.set(currentPage, window.scrollY);
    currentPage = page;
    // A route change must never leave an unrelated modal covering the new page.
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    document.body.dataset.page = page;
    document.querySelectorAll('.page').forEach(node => {
      node.classList.toggle('active', node.id === page);
    });
    document.querySelectorAll('.nav [data-tab]').forEach(node => {
      node.classList.toggle('active', node.dataset.tab === page);
      if (node.dataset.tab === page) node.setAttribute('aria-current', 'page');
      else node.removeAttribute('aria-current');
    });
    document.title = `${PAGE_TITLES[page]} · 懒懒塔罗`;
    onEnter(page);
    window.scrollTo({ top: positions.get(page) ?? 0, behavior: 'instant' });
    const heading = document.querySelector(`#${page} h1`);
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
  }

  const router = createPageRouter({ location: window.location, history: window.history, render });
  // pushState is used for clicks; browser back/forward and edited hashes restore the existing views.
  listen(window, 'popstate', router.restore, signal);
  listen(window, 'hashchange', router.restore, signal);

  listen(document, 'click', event => {
    const button = event.target.closest('[data-tab]');
    if (!button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    router.show(button.dataset.tab);
  }, signal);
  listen(element('.skip-link'), 'click', event => {
    event.preventDefault(); element('#main-content').focus();
  }, signal);
  listen(element('.brand'), 'click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    router.show('home');
  }, signal);

  return { show: router.show };
}
