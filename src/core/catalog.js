export const SUIT_NAMES = Object.freeze({
  major: '大阿尔卡那',
  wands: '权杖',
  cups: '圣杯',
  swords: '宝剑',
  pentacles: '星币',
});
export const SPREAD_LEVELS = ['入门', '进阶', '深入'];
const LAYOUTS = new Set(['single', 'line', 'fork', 'mirror', 'grid', 'week', 'celtic']);

function entries(document, key) {
  if (document?.schemaVersion !== 1 || !Array.isArray(document[key]) ||
      !document[key].length) {
    throw new Error(`${key} 资料格式无效`);
  }
  return document[key];
}

function requireText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateCards(document) {
  const cards = entries(document, 'cards');
  const ids = new Set();
  for (const card of cards) {
    const validRank = card.suit === 'major'
      ? card.rank >= 0 && card.rank <= 21
      : card.rank >= 1 && card.rank <= 14;
    const expectedPath = `cards/${card.suit}-${String(card.rank).padStart(2, '0')}.jpg`;
    if (!Object.hasOwn(SUIT_NAMES, card.suit) || !Number.isInteger(card.rank) ||
        !validRank || card.id !== `${card.suit}-${card.rank}` || ids.has(card.id) ||
        !['name', 'english', 'upright', 'reversed', 'prompt'].every(key => requireText(card[key])) ||
        !Array.isArray(card.keywords) || !card.keywords.length ||
        !card.keywords.every(requireText) || typeof card.symbol !== 'string' ||
        card.imagePath !== expectedPath) {
      throw new Error('牌组定义无效');
    }
    ids.add(card.id);
  }
  return cards;
}

export function validateSpreads(document) {
  const spreads = entries(document, 'spreads');
  const ids = new Set();
  for (const spread of spreads) {
    if (!/^[a-z]+$/.test(spread.id) || ids.has(spread.id) ||
        !['name', 'description', 'example', 'readingTip'].every(key => requireText(spread[key])) ||
        !SPREAD_LEVELS.includes(spread.level) || !LAYOUTS.has(spread.layout) ||
        !Number.isInteger(spread.count) || spread.count < 1 || spread.count > 78 ||
        !Array.isArray(spread.positions) || spread.positions.length !== spread.count) {
      throw new Error('牌阵定义无效');
    }
    ids.add(spread.id);
    for (const position of spread.positions) {
      if (!requireText(position.name) || !requireText(position.prompt) ||
          !Number.isInteger(position.row) || position.row < 1 ||
          !Number.isInteger(position.column) || position.column < 1) {
        throw new Error('牌阵位置无效');
      }
    }
    if (spread.sourceNote && (!requireText(spread.sourceNote) ||
        !/^https:\/\//.test(spread.sourceUrl))) {
      throw new Error('牌阵资料来源无效');
    }
  }
  return spreads;
}

export function validateScenarios(document) {
  const scenarios = entries(document, 'scenarios');
  if (!scenarios.every(scenario => ['question', 'lens', 'action']
    .every(key => requireText(scenario[key])))) {
    throw new Error('练习题目无效');
  }
  return scenarios;
}

export function searchCards(cards, { suit = 'all', query = '' } = {}) {
  const term = query.trim().toLowerCase();
  return cards.filter(card => {
    const matchesSuit = suit === 'all' || suit === card.suit;
    const searchableText = [card.name, card.english, card.upright, ...card.keywords]
      .join(' ').toLowerCase();
    return matchesSuit && searchableText.includes(term);
  });
}
