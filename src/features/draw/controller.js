import { confirmAction } from '../../shared/confirmation.js?v=5cfbefc47f66';
import { drawCards, describeReading } from '../../core/drawing.js?v=5cfbefc47f66';
import { element, listen } from '../../shared/dom.js?v=5cfbefc47f66';
import { createDrawView } from './view.js?v=5cfbefc47f66';
import { createReadingAssistantView } from './ai-view.js?v=5cfbefc47f66';
import { requestAI } from '../../shared/ai-client.js?v=5cfbefc47f66';
import { createLatestRequest } from '../../shared/ai-view.js?v=5cfbefc47f66';
import { validateInterpretation } from '../../core/ai-contract.js?v=5cfbefc47f66';

export function mountDraw({ cards, spreads, signal, aiAvailable = true, onSave }) {
  const view = createDrawView();
  const assistant = createReadingAssistantView();
  const request = createLatestRequest(signal);
  const reversed = element('#reversed');
  const question = element('#question');
  const breakpoint = window.matchMedia('(min-width:720px)');
  let spread = spreads.find(item => item.id === 'daily') ?? spreads[0];
  let reading = [];
  let readingId;
  let readingQuestion = '';
  let assistantWasHidden = true; 
  let feedback = null;

  function renderTable() {
    view.showTable(spread, reading, breakpoint.matches);
  }

  function selectSpread(id) {
    const selected = spreads.find(item => item.id === id);
    if (!selected) throw new Error('未知牌阵');
    spread = selected;
    reading = [];
    feedback = null;
    element('#save-reading').disabled = true;
    request.cancel();
    assistant.reset(false);
    view.showSpread(spread);
    renderTable();
  }

  function draw() {
    request.cancel();
    reading = drawCards(cards, spread.count, reversed.checked);
    readingId = crypto.randomUUID();
    readingQuestion = question.value.trim();
    feedback = null;
    element('#save-reading').disabled = false;
    element('#draw-save-message').textContent = '';
    renderTable();
    view.showReading(spread, reading, readingQuestion);
    assistant.reset(aiAvailable);
    return describeReading(spread, reading);
  }

  async function interpret() {
    if (!aiAvailable || !reading.length) return;
    const pending = request.start();
    const snapshot = { spread, reading, question: readingQuestion };
    assistant.loading();
    try {
      const value = validateInterpretation(await requestAI('interpret', {
        spreadId: snapshot.spread.id,
        cards: snapshot.reading.map(({ card, reverse }) => ({ id: card.id, reverse })),
        question: snapshot.question,
      }, pending), snapshot.reading.length);
      if (!pending.aborted) { feedback = value; assistant.showResult(value, snapshot.spread, snapshot.reading, snapshot.question); }
    } catch (error) {
      if (!pending.aborted) {
        if (error.name === 'AbortError') assistant.reset(aiAvailable);
        else assistant.showError(error.message);
      }
    }
  }

  view.populate(spreads);
  selectSpread(spread.id);
  listen(element('#spread-select'), 'change', async event => {
    const id = event.target.value;
    if (reading.length && !await confirmAction({ title: '更换牌阵？', message: '当前抽牌结果将被替换。需要保留的话，可以先记到笔记。', confirmLabel: '更换牌阵', cancelLabel: '保留结果' })) {
      event.target.value = spread.id; document.dispatchEvent(new Event('spreadchange')); return;
    }
    selectSpread(id);
  }, signal);
  async function redraw() {
    if (reading.length && !await confirmAction({ title: '重新抽一次？', message: '这会替换当前牌面与解读。需要保留的话，可以先记到笔记。', confirmLabel: '重新抽牌', cancelLabel: '保留结果' })) return;
    draw();
    element('#draw-reading').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  listen(element('#draw-button'), 'click', redraw, signal);
  listen(element('#redraw-button'), 'click', redraw, signal);
  listen(element('#edit-reading-setup'), 'click', () => {
    assistantWasHidden = element('#reading-assistant').hidden;
    view.showMode('setup'); element('#reading-assistant').hidden = true; element('#cancel-reading-setup').hidden = false;
    element('#question').focus({ preventScroll: true });
  }, signal);
  listen(element('#cancel-reading-setup'), 'click', () => {
    question.value = readingQuestion; view.showMode('reading'); element('#reading-assistant').hidden = assistantWasHidden || !aiAvailable;
  }, signal);
  listen(element('#interpret-reading'), 'click', interpret, signal);
  listen(element('#save-reading'), 'click', async () => {
    if (!reading.length || !onSave) return;
    const button = element('#save-reading');
    button.disabled = true;
    try {
      await onSave({ id: readingId, kind: 'draw', spreadId: spread.id, spreadName: spread.name,
        question: readingQuestion || `${spread.name} · 抽牌记录`,
        cards: reading.map(({ card, reverse }, index) => ({ id: card.id, reverse, position: spread.positions[index].name })), feedback });
    } catch (error) { element('#draw-save-message').textContent = error.message; }
    finally { button.disabled = false; }
  }, signal);
  // Resizing only re-renders the layout; it must never reshuffle an existing reading.
  listen(breakpoint, 'change', renderTable, signal);

  return {
    selectSpread,
    draw,
    setReversed(value) { reversed.checked = value; },
    get includeReversed() { return reversed.checked; },
  };
}
