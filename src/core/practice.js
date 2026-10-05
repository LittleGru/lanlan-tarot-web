import { drawCards, randomIndex } from './drawing.js?v=46b267219527';

export function scenarioSupportsSpread(scenario, spreadId) {
  return !scenario.spreadIds || scenario.spreadIds.includes(spreadId);
}

/** Owns a complete reading and counts a submitted exercise only once. */
export function createPracticeSession(cards, scenarios, spreads, pickIndex = randomIndex) {
  let exercise = null;
  let completed = 0;
  let revealed = false;

  function start(includeReversed, spreadId = 'daily') {
    const spread = spreads.find(item => item.id === spreadId);
    if (!spread) throw new Error('未知练习牌阵');
    const eligible = scenarios.map((scenario, index) => ({ scenario, index }))
      .filter(({ scenario }) => scenarioSupportsSpread(scenario, spread.id));
    const candidates = eligible.filter(({ index }) => eligible.length === 1 || index !== exercise?.scenarioIndex);
    if (!candidates.length) throw new Error('该牌阵暂无练习题目');
    const scenarioIndex = candidates[pickIndex(candidates.length)].index;
    exercise = {
      spread,
      reading: drawCards(cards, spread.count, includeReversed, pickIndex),
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
    start, reveal,
    get exercise() { return exercise; },
    get completed() { return completed; },
  };
}
