import { createPracticeSession } from '../../core/practice.js?v=b595f55a60fa';
import { element, listen } from '../../shared/dom.js?v=b595f55a60fa';
import { createPracticeView } from './view.js?v=b595f55a60fa';
import { createGradingView } from './ai-view.js?v=b595f55a60fa';
import { createLatestRequest } from '../../shared/ai-view.js?v=b595f55a60fa';
import { requestAI } from '../../shared/ai-client.js?v=b595f55a60fa';
import { validateGrade } from '../../core/ai-contract.js?v=b595f55a60fa';

export function mountPractice({ cards, scenarios, includeReversed, signal, aiAvailable = true }) {
  const session = createPracticeSession(cards, scenarios);
  const view = createPracticeView();
  const grading = createGradingView();
  const request = createLatestRequest(signal);
  const input = element('#interpretation');

  function start() {
    request.cancel();
    grading.reset();
    const exercise = session.start(includeReversed());
    view.showExercise(exercise);
    return {
      id: exercise.card.id,
      name: exercise.card.name,
      orientation: exercise.reverse ? 'reversed' : 'upright',
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
        card: { id: exercise.card.id, reverse: exercise.reverse },
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
