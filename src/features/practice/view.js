import { element, escapeHTML as html } from '../../shared/dom.js?v=b595f55a60fa';
import { renderCardFace, renderCardCaption, renderTags, orientationLabel } from '../../shared/card-view.js?v=b595f55a60fa';

export function createPracticeView() {
  const input = element('#interpretation');
  const reference = element('#reference');
  const message = element('#practice-message');
  const revealButton = element('#reveal-reference');

  function showExercise(exercise) {
    element('#scenario').textContent = exercise.scenario.question;
    element('#practice-card').innerHTML = renderCardFace(exercise, exercise.card.name) +
      renderCardCaption(exercise);
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

  function showReference({ card, reverse, scenario }, completed) {
    message.textContent = '参考说明已显示。你可以对照检查，也可以继续修改解读。';
    element('#practice-count').textContent = `本次练习：${completed} 题`;
    reference.hidden = false;
    reference.innerHTML = `
      <div class="reference">
        <p class="eyebrow">参考说明 · ${html(card.name)} ${orientationLabel(reverse)}</p>
        <h3>牌义参考</h3><div class="tags">${renderTags(card)}</div>
        <p>${html(reverse ? card.reversed : card.upright)}</p>
        <h3>题目分析</h3><p>${html(scenario.lens)}</p>
        <p class="reflection">解读问题：${html(card.prompt)}</p>
        <h3>建议方向</h3><p>${html(scenario.action)}</p>
        <div class="self-check">
          <label><input type="checkbox">描述了具体的牌面线索</label>
          <label><input type="checkbox">说明了牌义与题目的联系</label>
          <label><input type="checkbox">提出了具体的建议</label>
        </div>
        <p class="muted">以上为固定参考说明，不会对你的解读评分。可以有不同解释，但应说明依据。</p>
      </div>`;
    revealButton.textContent = '参考说明已显示';
  }

  return { showExercise, updateCharacterCount, showValidation, showReference };
}
