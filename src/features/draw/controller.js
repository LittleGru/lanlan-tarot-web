import { drawCards, describeReading } from '../../core/drawing.js?v=83cc152c2770';
import { element, listen } from '../../shared/dom.js?v=83cc152c2770';
import { createDrawView } from './view.js?v=83cc152c2770';
import { createReadingAssistantView } from './ai-view.js?v=83cc152c2770';
import { requestAI } from '../../shared/ai-client.js?v=83cc152c2770';
import { createLatestRequest } from '../../shared/ai-view.js?v=83cc152c2770';
import { validateInterpretation } from '../../core/ai-contract.js?v=83cc152c2770';

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
    feedback = null;
    element('#save-reading').disabled = false;
    element('#draw-save-message').textContent = '';
    renderTable();
    view.showReading(spread, reading, question.value.trim());
    assistant.reset(aiAvailable);
    return describeReading(spread, reading);
  }

  async function interpret() {
    if (!aiAvailable || !reading.length) return;
    const pending = request.start();
    const snapshot = { spread, reading, question: question.value.trim() };
    assistant.loading();
    try {
      const value = validateInterpretation(await requestAI('interpret', {
        spreadId: snapshot.spread.id,
        cards: snapshot.reading.map(({ card, reverse }) => ({ id: card.id, reverse })),
        question: snapshot.question,
      }, pending), snapshot.reading.length);
      if (!pending.aborted) { feedback = value; assistant.showResult(value, snapshot.spread, snapshot.reading, snapshot.question); }
    } catch (error) {
      if (!pending.aborted) assistant.showError(error.message);
    }
  }

  view.populate(spreads);
  selectSpread(spread.id);
  listen(element('#spread-select'), 'change', event => selectSpread(event.target.value), signal);
  listen(element('#draw-button'), 'click', draw, signal);
  listen(element('#interpret-reading'), 'click', interpret, signal);
  listen(element('#save-reading'), 'click', async () => {
    if (!reading.length || !onSave) return;
    const button = element('#save-reading');
    button.disabled = true;
    try {
      await onSave({ id: readingId, kind: 'draw', spreadId: spread.id, spreadName: spread.name,
        question: question.value.trim() || `${spread.name} · 抽牌记录`,
        cards: reading.map(({ card, reverse }, index) => ({ id: card.id, reverse, position: spread.positions[index].name })), feedback });
    } catch (error) { element('#draw-save-message').textContent = error.message; }
    finally { button.disabled = false; }
  }, signal);
  listen(question, 'input', () => {
    request.cancel();
    feedback = null;
    assistant.reset(aiAvailable && reading.length > 0);
    if (reading.length) view.showQuestion(question.value.trim());
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
