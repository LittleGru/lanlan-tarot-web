export const PAGE_TITLES = Object.freeze({
  draw: '抽牌', learn: '牌义资料', practice: '解读练习', guide: '入门指南',
});

export function pageFromHash(hash) {
  const page = hash.replace(/^#\/?/, '');
  return Object.hasOwn(PAGE_TITLES, page) ? page : 'draw';
}

/** Hash routes work on GitHub Pages without a server-side fallback. */
export function createPageRouter({ location, history, render }) {
  let current;

  function restore() {
    const page = pageFromHash(location.hash);
    if (location.hash !== `#/${page}`) history.replaceState(history.state, '', `#/${page}`);
    if (page === current) return;
    current = page;
    render(page);
  }

  function show(page) {
    if (!Object.hasOwn(PAGE_TITLES, page)) throw new Error('未知页面');
    if (page === current) return;
    history.pushState(null, '', `#/${page}`);
    restore();
  }

  restore();
  return { show, restore };
}
