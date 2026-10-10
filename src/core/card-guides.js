export const GUIDE_DOMAINS = Object.freeze({ love: '爱情与关系', career: '事业与学习', money: '财务与资源', growth: '个人成长' });

/** Guides are separate from the concise deck consumed by drawing and AI. */
export function validateGuides(document, cards) {
  if (document?.schemaVersion !== 1 || !Array.isArray(document.guides)) throw new Error('完整牌义格式无效');
  const ids = new Set(cards.map(card => card.id));
  const seen = new Set();
  const text = value => typeof value === 'string' && value.trim().length > 0;
  for (const guide of document.guides) {
    if (!ids.has(guide.cardId) || seen.has(guide.cardId) || !text(guide.introduction) || !text(guide.pitfall) ||
      !Array.isArray(guide.symbols) || guide.symbols.length < 3 || !guide.symbols.every(item => text(item.name) && text(item.meaning)) ||
      !Array.isArray(guide.questions) || !guide.questions.length || !guide.questions.every(text) ||
      !['question', 'reasoning', 'answer'].every(key => text(guide.example?.[key])) ||
      !Array.isArray(guide.related) || guide.related.some(id => !ids.has(id) || id === guide.cardId) ||
      !['upright', 'reversed'].every(orientation => ['overview', ...Object.keys(GUIDE_DOMAINS), 'advice'].every(key => text(guide[orientation]?.[key])))) {
      throw new Error('完整牌义内容缺失或引用无效');
    }
    seen.add(guide.cardId);
  }
  return document.guides;
}
