import { SUIT_NAMES } from '../core/catalog.js?v=7887522df624';
import { element, escapeHTML as html, listen } from './dom.js?v=7887522df624';
import { renderTags } from './card-view.js?v=7887522df624';
import { GUIDE_DOMAINS } from '../core/card-guides.js?v=7887522df624';

export function mountCardDialog(cards, signal, { guides = [], onNote } = {}) {
  const cardsById = new Map(cards.map(card => [card.id, card]));
  const dialog = element('#card-dialog');
  const content = element('#card-detail');
  const guidesById = new Map(guides.map(guide => [guide.cardId, guide]));
  let current;
  let orientation = 'upright';

  function renderGuide(card, guide) {
    const meaning = guide[orientation];
    return `<div class="guide-layout">
      <aside class="guide-portrait"><img src="${html(card.imagePath)}" alt="${html(card.name)}牌面"><p class="eyebrow">${html(SUIT_NAMES[card.suit])}</p><h2 id="detail-title">${html(card.name)}</h2><p class="english">${html(card.english)}</p><div class="tags">${renderTags(card)}</div><button class="outline" data-card-note="${html(card.id)}">写学习笔记</button></aside>
      <article class="guide-content"><p class="eyebrow">CARD STUDY · 完整牌义</p><p class="guide-intro">${html(guide.introduction)}</p>
      <h3>先看画面</h3><div class="symbol-grid">${guide.symbols.map(symbol => `<section><h4>${html(symbol.name)}</h4><p>${html(symbol.meaning)}</p></section>`).join('')}</div>
      <div class="orientation-switch" role="group" aria-label="切换正逆位解读"><button data-guide-orientation="upright" aria-pressed="${orientation === 'upright'}">正位解读</button><button data-guide-orientation="reversed" aria-pressed="${orientation === 'reversed'}">逆位解读</button></div>
      <section class="meaning-overview"><h3>${orientation === 'upright' ? '正位' : '逆位'} · 核心含义</h3><p>${html(meaning.overview)}</p><p class="guide-advice"><b>可以怎样做</b> ${html(meaning.advice)}</p></section>
      <div class="domain-grid">${Object.entries(GUIDE_DOMAINS).map(([key, label]) => `<section><h4>${html(label)}</h4><p>${html(meaning[key])}</p></section>`).join('')}</div>
      <h3>把牌放进问题里</h3><section class="guide-example"><h4>${html(guide.example.question)}</h4><p><b>解读依据</b> ${html(guide.example.reasoning)}</p><p><b>参考表达</b> ${html(guide.example.answer)}</p></section>
      <h3>留给自己的问题</h3><ul>${guide.questions.map(question => `<li>${html(question)}</li>`).join('')}</ul>
      <p class="guide-pitfall"><b>常见误读</b> ${html(guide.pitfall)}</p>
      <div class="related-guides"><span>对照学习</span>${guide.related.map(id => `<button class="text-button" data-detail="${html(id)}">${html(cardsById.get(id).name)} ↗</button>`).join('')}</div>
      <p class="muted guide-source">画面参考韦特牌组；以上为结合日常情境撰写的学习解读，不是唯一牌义。</p></article></div>`;
  }

  function open(id) {
    const card = cardsById.get(id);
    if (!card) throw new Error('没有找到牌');
    current = card;
    orientation = 'upright';
    dialog.classList.toggle('complete-guide-dialog', guidesById.has(id));
    content.innerHTML = guidesById.has(id) ? renderGuide(card, guidesById.get(id)) : `
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
          <button class="outline" data-card-note="${html(card.id)}">写学习笔记</button>
        </div>
      </div>`;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  listen(document, 'click', event => {
    const button = event.target.closest('[data-detail]');
    if (button) open(button.dataset.detail);
  }, signal);
  listen(content, 'click', event => {
    const toggle = event.target.closest('[data-guide-orientation]');
    if (toggle && ['upright', 'reversed'].includes(toggle.dataset.guideOrientation)) {
      const scroll = dialog.scrollTop;
      orientation = toggle.dataset.guideOrientation;
      content.innerHTML = renderGuide(current, guidesById.get(current.id));
      content.querySelector(`[data-guide-orientation="${orientation}"]`).focus({ preventScroll: true });
      dialog.scrollTop = scroll;
    }
    const note = event.target.closest('[data-card-note]');
    if (note && onNote) { dialog.close(); onNote(cardsById.get(note.dataset.cardNote), orientation === 'reversed'); }
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
