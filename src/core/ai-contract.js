export const GRADING_CRITERIA = [
  { id: 'evidence', name: '牌面依据', maximum: 25 },
  { id: 'connection', name: '题目联系', maximum: 45 },
  { id: 'advice', name: '建议与表达', maximum: 30 },
];

function text(value, maximum = 2400) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
}

function textList(value) {
  return Array.isArray(value) && value.length >= 1 && value.length <= 5 &&
    value.every(item => text(item, 800));
}

/** Validate provider output before displaying it or calculating a score. */
export function validateInterpretation(value, cardCount) {
  if (!value || !text(value.summary) || !text(value.connections) ||
      !text(value.reflection, 800) || !textList(value.suggestions) ||
      !Array.isArray(value.cards) || value.cards.length !== cardCount ||
      value.cards.some((card, index) => card.index !== index + 1 || !text(card.explanation))) {
    throw new Error('解读结果格式不完整');
  }
  return value;
}

export function validateGrade(value) {
  if (!value || !text(value.summary) || !text(value.example) ||
      !textList(value.strengths) || !textList(value.improvements) ||
      !Array.isArray(value.criteria) || value.criteria.length !== GRADING_CRITERIA.length) {
    throw new Error('评分结果格式不完整');
  }
  const criteria = GRADING_CRITERIA.map(criterion => {
    const item = value.criteria.find(item => item.id === criterion.id);
    if (!item || !Number.isInteger(item.score) || item.score < 0 ||
        item.score > criterion.maximum || !text(item.feedback, 800)) {
      throw new Error('评分项目不完整');
    }
    return { ...item, ...criterion };
  });
  return { ...value, criteria, score: criteria.reduce((sum, item) => sum + item.score, 0) };
}
