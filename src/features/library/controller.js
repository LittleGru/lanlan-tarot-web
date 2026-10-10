import { searchCards } from '../../core/catalog.js?v=83cc152c2770';
import { element, escapeHTML as html, listen } from '../../shared/dom.js?v=83cc152c2770';

export function mountLibrary({ cards, guides = [], signal }) {
  const search = element('#search');
  const grid = element('#library-grid');
  const filters = element('#filters');
  let suit = 'all';
  const guideIds = new Set(guides.map(guide => guide.cardId));

  function render() {
    const matches = searchCards(cards, { suit: suit === 'complete' ? 'all' : suit, query: search.value })
      .filter(card => suit !== 'complete' || guideIds.has(card.id));
    element('#library-count').textContent = `共 ${matches.length} 张牌 · 点击查看详情`;
    grid.innerHTML = matches.length ? matches.map(card => `
      <button class="library-card" data-detail="${html(card.id)}">
        <img src="${html(card.imagePath)}" alt="${html(card.name)}牌面" loading="lazy" width="150" height="255">
        <b>${html(card.name)}</b>
        ${guideIds.has(card.id) ? '<span class="guide-badge">完整牌义</span>' : ''}
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
