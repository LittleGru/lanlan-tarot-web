import { escapeHTML as html } from './dom.js?v=cdac01788a19';

export function orientationLabel(reverse) {
  return reverse ? '逆位' : '正位';
}

export function renderTags(card) {
  return card.keywords.map(keyword => `<span class="tag">${html(keyword)}</span>`).join('');
}

export function renderCardFace(drawn, label) {
  if (!drawn) {
    return `
      <div class="tarot-card card-back" aria-label="${html(label)}：等待抽牌">
        <span class="back-glyph" aria-hidden="true">☾</span>
        <span class="back-line">MOONLIT</span>
      </div>`;
  }

  const { card, reverse } = drawn;
  return `
    <button class="tarot-card" data-detail="${html(card.id)}"
      aria-label="${html(label)}：查看${html(card.name)}${orientationLabel(reverse)}牌义">
      <img src="${html(card.imagePath)}" alt="${html(card.name)}牌面"
        ${reverse ? 'class="reversed"' : ''}>
    </button>`;
}

export function renderCardCaption({ card, reverse }) {
  return `
    <span class="card-name">${html(card.name)}</span>
    <span class="orientation ${reverse ? 'reverse' : ''}">${orientationLabel(reverse)}</span>`;
}
