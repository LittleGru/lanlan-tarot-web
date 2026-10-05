import { drawCards, randomIndex } from './drawing.js?v=2a24e698b1e4';

/** One session owns its exercise and completion count; it has no DOM dependency. */
export function createPracticeSession(cards, scenarios, pickIndex = randomIndex) {
  let exercise = null;
  let completed = 0;
  let revealed = false;

  function start(includeReversed) {
    // Choose uniformly from the remaining scenarios rather than biasing the next one.
    const candidates = scenarios.map((_, index) => index)
      .filter(index => scenarios.length === 1 || index !== exercise?.scenarioIndex);
    const scenarioIndex = candidates[pickIndex(candidates.length)];
    exercise = {
      ...drawCards(cards, 1, includeReversed, pickIndex)[0],
      scenarioIndex,
      scenario: scenarios[scenarioIndex],
    };
    revealed = false;
    return exercise;
  }

  function reveal(interpretation) {
    if (!exercise) throw new Error('请先开始练习');
    if (interpretation.trim().length < 10) return false;
    if (!revealed) completed += 1;
    revealed = true;
    return true;
  }

  return {
    start,
    reveal,
    get exercise() { return exercise; },
    get completed() { return completed; },
  };
}
