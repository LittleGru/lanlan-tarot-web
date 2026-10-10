import { SPREAD_LEVELS } from '../../core/catalog.js?v=cdac01788a19';
import { element, escapeHTML as html } from '../../shared/dom.js?v=cdac01788a19';
import { renderCardFace, renderCardCaption, renderTags, orientationLabel } from '../../shared/card-view.js?v=cdac01788a19';

function renderSlot(position, index, drawn) {
  return `
    <div class="card-slot" style="grid-row:${position.row};grid-column:${position.column}">
      <span class="position"><b>${index + 1}</b> ${html(position.name)}</span>
      ${renderCardFace(drawn, position.name)}
      ${drawn ? renderCardCaption(drawn) : ''}
    </div>`;
}

function renderCrossPair(spread, reading) {
  const positions = spread.positions.slice(0, 2);
  return `
    <div class="cross-pair" style="grid-row:2;grid-column:2">
      <div class="cross-positions">
        ${positions.map((position, index) => `
          <span class="position"><b>${index + 1}</b> ${html(position.name)}</span>`).join('')}
      </div>
      <div class="cross-stage">
        ${positions.map((position, index) => `
          <div class="cross-face ${index === 1 ? 'crossing' : ''}">
            ${renderCardFace(reading[index], `${index + 1} ${position.name}`)}
          </div>`).join('')}
      </div>
      ${reading.length ? `
        <div class="cross-legend">
          ${positions.map((_, index) => {
            const drawn = reading[index];
            return `<button class="text-button" data-detail="${html(drawn.card.id)}">
              ${index + 1} · ${html(drawn.card.name)} · ${orientationLabel(drawn.reverse)}
            </button>`;
          }).join('')}
        </div>` : ''}
    </div>`;
}

export function createDrawView() {
  const selector = element('#spread-select');
  const table = element('#draw-table');
  const results = element('#draw-results');
  const drawButton = element('#draw-button');
  const caption = element('#draw-caption');

  function populate(spreads) {
    selector.innerHTML = SPREAD_LEVELS.map(level => `
      <optgroup label="${level}">
        ${spreads.filter(spread => spread.level === level).map(spread => `
          <option value="${html(spread.id)}">${html(spread.name)} · ${spread.count} 张</option>`).join('')}
      </optgroup>`).join('');
    selector.disabled = false;
    drawButton.disabled = false;
  }

  function showSpread(spread) {
    selector.value = spread.id;
    element('#spread-level').textContent = `${spread.level} · ${spread.count} 张`;
    element('#spread-description').textContent = spread.description;
    element('#question').placeholder = spread.example;
    element('#spread-reading-tip').textContent = spread.readingTip;
    element('#spread-position-guide').innerHTML = spread.positions.map((position, index) => `
      <li><b>${index + 1} · ${html(position.name)}</b><span>${html(position.prompt)}</span></li>`).join('');

    const sourceNote = element('#spread-source-note');
    sourceNote.hidden = !spread.sourceNote;
    sourceNote.replaceChildren();
    if (spread.sourceNote) {
      const link = document.createElement('a');
      link.href = spread.sourceUrl;
      link.textContent = '阅读原书';
      link.target = '_blank';
      link.rel = 'noopener';
      sourceNote.append(document.createTextNode(`${spread.sourceNote} `), link);
    }

    element('#draw .workspace').dataset.wide = String(spread.count > 3);
    results.hidden = true;
    results.replaceChildren();
    caption.textContent = spread.layout === 'celtic'
      ? '按编号阅读；第 2 张横置，正逆位以标签为准。'
      : '可展开牌阵说明查看各位置的含义。';
    drawButton.innerHTML = '洗牌并抽牌 <span aria-hidden="true">✧</span>';
  }

  function showTable(spread, reading, useCrossLayout) {
    table.className = `draw-table layout-${spread.layout}`;
    table.dataset.count = spread.count;
    const crossed = spread.layout === 'celtic' && useCrossLayout;
    table.innerHTML = spread.positions.map((position, index) => {
      if (crossed && index < 2) return index === 0 ? renderCrossPair(spread, reading) : '';
      return renderSlot(position, index, reading[index]);
    }).join('');
  }

  function showReading(spread, reading, question) {
    caption.textContent = spread.layout === 'celtic'
      ? '点击牌面或中央的牌名查看牌义。第 2 张横置，正逆位以标签为准。'
      : '点击牌面查看牌义，下方列有各位置的解读提示。';
    drawButton.innerHTML = '重新洗牌 <span aria-hidden="true">✧</span>';
    results.hidden = false;
    results.innerHTML = `
      <div class="result-heading">
        <h2>${html(spread.name)} · 牌义参考</h2>
        <button class="text-button" data-tab="practice">继续练习解读</button>
      </div>
      <p id="reading-question" class="reading-question" hidden></p>
      <div class="result-grid ${spread.count === 1 ? 'single' : ''}">
        ${reading.map(({ card, reverse }, index) => `
          <article class="result-card">
            <p class="eyebrow">${index + 1} · ${html(spread.positions[index].name)}</p>
            <h3>${html(card.name)} · ${orientationLabel(reverse)}</h3>
            <p class="position-prompt">${html(spread.positions[index].prompt)}</p>
            <div class="tags">${renderTags(card)}</div>
            <p>${html(reverse ? card.reversed : card.upright)}</p>
            <p class="reflection">解读问题：${html(card.prompt)}</p>
          </article>`).join('')}
      </div>
      <p class="reading-tip">阅读建议：${html(spread.readingTip)}</p>`;
    showQuestion(question);
  }

  function showQuestion(question) {
    const questionDisplay = element('#reading-question');
    questionDisplay.hidden = !question;
    questionDisplay.textContent = question ? `本次问题：${question}` : '';
  }

  return { populate, showSpread, showTable, showReading, showQuestion };
}
