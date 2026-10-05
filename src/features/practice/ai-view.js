import { element, escapeHTML as html } from '../../shared/dom.js?v=31f361fd3edd';
import { setAIState, renderTextList } from '../../shared/ai-view.js?v=31f361fd3edd';

export function createGradingView() {
  const button = element('#grade-practice');
  const message = element('#grading-message');
  const result = element('#grading-result');
  const nodes = { button, message, result };

  function reset() {
    setAIState(nodes, 'idle');
    button.textContent = '评分与建议';
  }

  function loading() {
    setAIState(nodes, 'loading');
    button.textContent = '正在评分…';
  }

  function showError(error) {
    setAIState(nodes, 'error', error);
    button.textContent = '重试评分';
  }

  function showValidation() {
    setAIState(nodes, 'error', '请先写下至少 10 个字的解读，再查看评分。');
    button.textContent = '评分与建议';
  }

  function showResult(value, completed) {
    setAIState(nodes, 'complete');
    button.textContent = '重新评分';
    element('#practice-count').textContent = `本次练习：${completed} 题`;
    result.hidden = false;
    result.innerHTML = `
      <div class="ai-output">
        <div class="score-heading"><h3>本次解读反馈</h3><span class="score-number">${value.score}<small> / 100</small></span></div>
        <p>${html(value.summary)}</p>
        <div class="grading-criteria">
          ${value.criteria.map(item => `
            <article class="grading-criterion">
              <h4><span>${html(item.name)}</span><span>${item.score} / ${item.maximum}</span></h4>
              <p>${html(item.feedback)}</p>
            </article>`).join('')}
        </div>
        <h3>做得好的地方</h3>${renderTextList(value.strengths)}
        <h3>可以改进的地方</h3>${renderTextList(value.improvements)}
        <h3>参考改写</h3><p>${html(value.example)}</p>
        <p class="ai-note">分数用于练习反馈，不能代表占卜是否准确。同一解读的再次评分可能略有差异。</p>
      </div>`;
  }

  return { reset, loading, showError, showValidation, showResult };
}
