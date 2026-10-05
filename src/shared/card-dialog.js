import { SUIT_NAMES } from '../core/catalog.js?v=46b267219527';
import { element, escapeHTML as html, listen } from './dom.js?v=46b267219527';
import { renderTags } from './card-view.js?v=46b267219527';

export function mountCardDialog(cards, signal) {
  const cardsById = new Map(cards.map(card => [card.id, card]));
  const dialog = element('#card-dialog');
  const content = element('#card-detail');

  function open(id) {
    const card = cardsById.get(id);
    if (!card) throw new Error('没有找到牌');
    content.innerHTML = `
      <div class="detail-layout">
        <img src="${html(card.imagePath)}" alt="${html(card.name)}牌面">
        <div>
          <p class="eyebrow">${html(SUIT_NAMES[card.suit])}</p>
          <h2 id="detail-title">${html(card.name)}</h2>
          <p class="english">${html(card.english)}</p>
          <div class="tags">${renderTags(card)}</div>
          <h3>正位</h3><p>${html(card.upright)}</p>
          <h3>逆位</h3><p>${html(card.reversed)}</p>
          ${card.symbol ? `<h3>画面线索</h3><p>${html(card.symbol)}</p>` : ''}
          <h3>解读问题</h3><p>${html(card.prompt)}</p>
        </div>
      </div>`;
    dialog.showModal();
  }

  listen(document, 'click', event => {
    const button = event.target.closest('[data-detail]');
    if (button) open(button.dataset.detail);
  }, signal);
  listen(element('#close-dialog'), 'click', () => dialog.close(), signal);
  listen(dialog, 'click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) dialog.close();
  }, signal);
}
