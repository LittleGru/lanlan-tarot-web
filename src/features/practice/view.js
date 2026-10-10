import { element, escapeHTML as html } from '../../shared/dom.js?v=7887522df624';
import { SPREAD_LEVELS } from '../../core/catalog.js?v=7887522df624';
import { renderCardFace, renderCardCaption, renderTags, orientationLabel } from '../../shared/card-view.js?v=7887522df624';

export function createPracticeView() {
  const input = element('#interpretation');
  const reference = element('#reference');
  const message = element('#practice-message');
  const revealButton = element('#reveal-reference');

  function populate(spreads) {
    element('#practice-spread').innerHTML = SPREAD_LEVELS.map(level => `
      <optgroup label="${level}">${spreads.filter(spread => spread.level === level).map(spread => `
        <option value="${html(spread.id)}">${html(spread.name)} · ${spread.count} 张</option>`).join('')}
      </optgroup>`).join('');
  }

  function showExercise({ spread, reading, scenario }) {
    element('#scenario').textContent = scenario.question;
    element('#practice-spread-description').textContent = spread.description;
    element('#practice .practice-layout').dataset.multi = String(spread.count > 1);
    const table = element('#practice-card');
    table.className = `practice-cards ${spread.count === 1 ? 'single' : ''}`;
    table.innerHTML = reading.map((drawn, index) => `
      <div class="practice-slot">
        <p class="position"><b>${index + 1}</b> ${html(spread.positions[index].name)}</p>
        ${renderCardFace(drawn, `${index + 1} ${spread.positions[index].name}`)}
        ${renderCardCaption(drawn)}
        <p class="practice-position-prompt">${html(spread.positions[index].prompt)}</p>
      </div>`).join('');
    element('#practice-reading-tip').textContent = spread.readingTip;
    input.value = '';
    updateCharacterCount();
    reference.hidden = true;
    reference.replaceChildren();
    message.textContent = '';
    revealButton.disabled = false;
    revealButton.textContent = '查看参考';
  }

  function updateCharacterCount() {
    element('#char-count').textContent = `${input.value.length} 字`;
  }

  function showValidation() {
    message.textContent = '请先写下至少 10 个字的解读，再查看参考说明。';
    input.focus();
  }

  function showReference({ spread, reading, scenario }, completed) {
    message.textContent = '参考说明已显示。你可以对照检查，也可以继续修改解读。';
    element('#practice-count').textContent = `本次练习：${completed} 题`;
    reference.hidden = false;
    reference.innerHTML = `
      <div class="reference">
        <p class="eyebrow">参考说明 · ${html(spread.name)}</p>
        ${reading.map(({ card, reverse }, index) => `
          <article class="practice-reference-card">
            <h3>${index + 1} · ${html(spread.positions[index].name)} · ${html(card.name)} ${orientationLabel(reverse)}</h3>
            <div class="tags">${renderTags(card)}</div>
            <p>${html(reverse ? card.reversed : card.upright)}</p>
            <p class="reflection">位置问题：${html(spread.positions[index].prompt)}</p>
          </article>`).join('')}
        <h3>串联牌阵</h3><p>${html(spread.readingTip)}</p>
        <h3>题目分析</h3><p>${html(scenario.lens)}</p>
        <h3>建议方向</h3><p>${html(scenario.action)}</p>
        <div class="self-check">
          <label><input type="checkbox">描述了具体的牌面线索与正逆位</label>
          <label><input type="checkbox">结合各位置说明了牌义与题目的联系</label>
          ${spread.count > 1 ? '<label><input type="checkbox">说明了牌与牌之间的联系</label>' : ''}
          <label><input type="checkbox">提出了具体的建议</label>
        </div>
        <p class="muted">以上为参考说明，不会对你的解读评分。可以有不同解释，但应说明依据。</p>
      </div>`;
    revealButton.textContent = '参考说明已显示';
  }

  return { populate, showExercise, updateCharacterCount, showValidation, showReference };
}
