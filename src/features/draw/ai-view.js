import { element, escapeHTML as html } from '../../shared/dom.js?v=a4d40a22b0f3';
import { setAIState, renderTextList } from '../../shared/ai-view.js?v=a4d40a22b0f3';
import { orientationLabel } from '../../shared/card-view.js?v=a4d40a22b0f3';

export function createReadingAssistantView() {
  const panel = element('#reading-assistant');
  const button = element('#interpret-reading');
  const message = element('#reading-ai-message');
  const result = element('#reading-ai-result');
  const nodes = { button, message, result };

  function reset(available) {
    panel.hidden = !available;
    setAIState(nodes, 'idle');
    button.textContent = '帮我解读';
  }

  function loading() {
    setAIState(nodes, 'loading');
    button.textContent = '正在解读…';
  }

  function showError(error) {
    setAIState(nodes, 'error', error);
    button.textContent = '重试解读';
  }

  function showResult(value, spread, reading, question) {
    setAIState(nodes, 'complete');
    button.textContent = '重新解读';
    result.hidden = false;
    result.innerHTML = `
      <div class="ai-output">
        ${question ? `<p class="reading-question">本次问题：${html(question)}</p>` : ''}
        <h3>整体解读</h3><p>${html(value.summary)}</p>
        <div class="ai-card-grid ${reading.length === 1 ? 'single' : ''}">
          ${value.cards.map((item, index) => `
            <article class="ai-card-note">
              <p class="eyebrow">${index + 1} · ${html(spread.positions[index].name)}</p>
              <h3>${html(reading[index].card.name)} · ${orientationLabel(reading[index].reverse)}</h3>
              <p>${html(item.explanation)}</p>
            </article>`).join('')}
        </div>
        <h3>${reading.length === 1 ? '需要留意的地方' : '牌与牌之间的联系'}</h3><p>${html(value.connections)}</p>
        <h3>可以尝试的行动</h3>${renderTextList(value.suggestions)}
        <p class="reflection">继续思考：${html(value.reflection)}</p>
      </div>`;
  }

  return { reset, loading, showError, showResult };
}
