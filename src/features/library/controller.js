import { searchCards } from '../../core/catalog.js?v=ec38052b7ca7';
import { element, escapeHTML as html, listen } from '../../shared/dom.js?v=ec38052b7ca7';

export function mountLibrary({ cards, signal }) {
  const search = element('#search');
  const grid = element('#library-grid');
  const filters = element('#filters');
  let suit = 'all';

  function render() {
    const matches = searchCards(cards, { suit, query: search.value });
    element('#library-count').textContent = `共 ${matches.length} 张牌 · 点击查看详情`;
    grid.innerHTML = matches.length ? matches.map(card => `
      <button class="library-card" data-detail="${html(card.id)}">
        <img src="${html(card.imagePath)}" alt="${html(card.name)}牌面" loading="lazy" width="150" height="255">
        <b>${html(card.name)}</b>
        <p>${html(card.keywords.slice(0, 2).join(' · '))}</p>
      </button>`).join('') : '<p class="empty-state">未找到相关牌。请更换牌名或关键词。</p>';
  }

  listen(search, 'input', render, signal);
  listen(filters, 'click', event => {
    const selected = event.target.closest('[data-filter]');
    if (!selected) return;
    suit = selected.dataset.filter;
    filters.querySelectorAll('[data-filter]').forEach(button => {
      button.classList.toggle('selected', button === selected);
      button.setAttribute('aria-pressed', String(button === selected));
    });
    render();
  }, signal);
  return { enter: render };
}
