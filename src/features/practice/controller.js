import { createPracticeSession } from '../../core/practice.js?v=31f361fd3edd';
import { element, listen } from '../../shared/dom.js?v=31f361fd3edd';
import { createPracticeView } from './view.js?v=31f361fd3edd';
import { createGradingView } from './ai-view.js?v=31f361fd3edd';
import { createLatestRequest } from '../../shared/ai-view.js?v=31f361fd3edd';
import { requestAI } from '../../shared/ai-client.js?v=31f361fd3edd';
import { validateGrade } from '../../core/ai-contract.js?v=31f361fd3edd';

export function mountPractice({ cards, spreads, scenarios, includeReversed, signal, aiAvailable = true }) {
  const session = createPracticeSession(cards, scenarios, spreads);
  const view = createPracticeView();
  const grading = createGradingView();
  const request = createLatestRequest(signal);
  const input = element('#interpretation');
  const selector = element('#practice-spread');
  view.populate(spreads);

  function start() {
    request.cancel();
    grading.reset();
    const exercise = session.start(includeReversed(), selector.value);
    view.showExercise(exercise);
    return {
      spreadId: exercise.spread.id,
      cards: exercise.reading.map(({ card, reverse }, index) => ({
        id: card.id, name: card.name, orientation: reverse ? 'reversed' : 'upright',
        position: exercise.spread.positions[index].name,
      })),
      question: exercise.scenario.question,
    };
  }

  async function grade() {
    if (!aiAvailable) return;
    if (!session.exercise) start();
    const interpretation = input.value.trim();
    if (interpretation.length < 10) {
      grading.showValidation();
      input.focus();
      return;
    }
    const exercise = session.exercise;
    const pending = request.start();
    grading.loading();
    try {
      const value = validateGrade(await requestAI('grade', {
        spreadId: exercise.spread.id,
        cards: exercise.reading.map(({ card, reverse }) => ({ id: card.id, reverse })),
        scenarioIndex: exercise.scenarioIndex,
        interpretation,
      }, pending));
      if (pending.aborted) return;
      session.reveal(interpretation);
      grading.showResult(value, session.completed);
    } catch (error) {
      if (!pending.aborted) grading.showError(error.message);
    }
  }

  function reveal() {
    if (!session.exercise) start();
    if (!session.reveal(element('#interpretation').value)) {
      view.showValidation();
      return false;
    }
    view.showReference(session.exercise, session.completed);
    return true;
  }

  listen(selector, 'change', start, signal);
  listen(element('#new-practice'), 'click', start, signal);
  listen(element('#reveal-reference'), 'click', reveal, signal);
  listen(element('#grade-practice'), 'click', grade, signal);
  listen(input, 'input', () => {
    request.cancel();
    grading.reset();
    view.updateCharacterCount();
  }, signal);
  return {
    start,
    enter() { if (!session.exercise) start(); },
  };
}
