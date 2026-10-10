import { escapeHTML as html } from '../../shared/dom.js?v=7887522df624';

const list = (title, values) => values?.length
  ? `<h4>${title}</h4><ul>${values.map(value => `<li>${html(value)}</li>`).join('')}</ul>` : '';

export function renderSavedFeedback(value) {
  if (!value) return '';
  const graded = value.score !== undefined;
  return `<details class="saved-feedback">
    <summary>本次 AI ${graded ? `评分 · ${html(value.score)} 分` : '解读'}</summary>
    <p>${html(value.summary)}</p>
    ${value.cards?.map(item => `<h4>第 ${item.index} 张牌</h4><p>${html(item.explanation)}</p>`).join('') ?? ''}
    ${value.connections ? `<h4>牌之间的联系</h4><p>${html(value.connections)}</p>` : ''}
    ${value.criteria?.map(item => `<h4>${html(item.name)} · ${html(item.score)} / ${html(item.maximum)}</h4><p>${html(item.feedback)}</p>`).join('') ?? ''}
    ${list('做得好的地方', value.strengths)}
    ${list('可以改进的地方', value.improvements)}
    ${value.example ? `<h4>参考改写</h4><p>${html(value.example)}</p>` : ''}
    ${list('可以尝试的行动', value.suggestions)}
    ${value.reflection ? `<p>${html(value.reflection)}</p>` : ''}
  </details>`;
}

export function renderNoteContext(snapshot, cardsById) {
  if (!snapshot) return '';
  const faces = snapshot.cards.map(item => {
    const card = cardsById.get(item.id);
    if (!card) return '';
    const orientation = item.reverse ? '逆位' : '正位';
    return `<button data-detail="${html(card.id)}">
      <span>${html(item.position)}</span>
      <img src="${html(card.imagePath)}" class="${item.reverse ? 'reversed' : ''}" alt="${html(card.name)}${orientation}">
      <b>${html(card.name)}</b><small>${orientation}</small>
    </button>`;
  }).join('');
  return `<p class="eyebrow">${html(snapshot.spreadName || '牌面记录')}</p>
    <p class="note-question">${html(snapshot.question)}</p>
    <div class="note-card-strip">${faces}</div>
    ${renderSavedFeedback(snapshot.feedback)}`;
}
