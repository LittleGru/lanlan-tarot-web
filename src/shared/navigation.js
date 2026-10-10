import { element, listen } from './dom.js?v=cdac01788a19';
import { createPageRouter, PAGE_TITLES } from '../core/routing.js?v=cdac01788a19';

export function createNavigation({ onEnter, signal }) {
  function render(page) {
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
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  const router = createPageRouter({ location: window.location, history: window.history, render });
  // pushState is used for clicks; browser back/forward and edited hashes restore the existing views.
  listen(window, 'popstate', router.restore, signal);
  listen(window, 'hashchange', router.restore, signal);

  listen(document, 'click', event => {
    const button = event.target.closest('[data-tab]');
    if (!button) return;
    event.preventDefault();
    router.show(button.dataset.tab);
  }, signal);
  listen(element('.brand'), 'click', event => {
    event.preventDefault();
    router.show('home');
  }, signal);

  return { show: router.show };
}
