import { validateCards, validateSpreads, validateScenarios } from '../core/catalog.js?v=cdac01788a19';
import { validateGuides } from '../core/card-guides.js?v=cdac01788a19';

async function readJSON(path, fetchResource) {
  const response = await fetchResource(path);
  if (!response.ok) throw new Error(`资料无法读取：${path}`);
  return response.json();
}

/** All clients use the same JSON source; no generated duplicate deck is maintained. */
export async function loadCatalog(fetchResource = globalThis.fetch) {
  const [cards, spreads, scenarios, guideDocument] = await Promise.all([
    readJSON('data/cards.json', fetchResource).then(validateCards),
    readJSON('data/spreads.json', fetchResource).then(validateSpreads),
    readJSON('data/scenarios.json', fetchResource).then(validateScenarios),
    readJSON('data/card-guides.json', fetchResource),
  ]);
  if (spreads.some(spread => spread.count > cards.length)) {
    throw new Error('牌阵张数超过牌组数量');
  }
  if (scenarios.some(scenario => scenario.spreadIds?.some(id => !spreads.some(spread => spread.id === id)))) {
    throw new Error('练习题目引用了未知牌阵');
  }
  return { cards, spreads, scenarios, guides: validateGuides(guideDocument, cards) };
}
