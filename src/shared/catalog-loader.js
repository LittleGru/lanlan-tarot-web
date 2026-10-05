import { validateCards, validateSpreads, validateScenarios } from '../core/catalog.js?v=2a24e698b1e4';

async function readJSON(path, fetchResource) {
  const response = await fetchResource(path);
  if (!response.ok) throw new Error(`资料无法读取：${path}`);
  return response.json();
}

/** All clients use the same JSON source; no generated duplicate deck is maintained. */
export async function loadCatalog(fetchResource = globalThis.fetch) {
  const [cards, spreads, scenarios] = await Promise.all([
    readJSON('data/cards.json', fetchResource).then(validateCards),
    readJSON('data/spreads.json', fetchResource).then(validateSpreads),
    readJSON('data/scenarios.json', fetchResource).then(validateScenarios),
  ]);
  if (spreads.some(spread => spread.count > cards.length)) {
    throw new Error('牌阵张数超过牌组数量');
  }
  return { cards, spreads, scenarios };
}
