import { validateGrade, validateInterpretation } from './ai-contract.js?v=c1a3470ea381';
const kinds = new Set(['study', 'draw', 'practice']);
export const NOTE_LIMIT = 300;

function savedFeedback(value, count) {
  if (!value) return null;
  if (value.criteria) {
    const grade = validateGrade(value);
    return { summary: grade.summary, score: grade.score, example: grade.example,
      strengths: grade.strengths, improvements: grade.improvements,
      criteria: grade.criteria.map(({ id, name, maximum, score, feedback }) => ({ id, name, maximum, score, feedback })) };
  }
  const reading = validateInterpretation(value, count);
  return { summary: reading.summary, connections: reading.connections, suggestions: reading.suggestions, reflection: reading.reflection,
    cards: reading.cards.map(({ index, explanation }) => ({ index, explanation })) };
}

/** Whitelist fields so session credentials and AI scenario signatures never enter records. */
export function createNote({ id = crypto.randomUUID(), title = '', body = '', kind = 'study', snapshot = null }, now = new Date().toISOString()) {
  if (!kinds.has(kind) || typeof title !== 'string' || title.length > 120 || typeof body !== 'string' || body.length > 20000 || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) throw new Error('笔记格式不正确或文字过长。');
  const context = snapshot ? {
    spreadId: String(snapshot.spreadId ?? '').slice(0, 30),
    spreadName: String(snapshot.spreadName ?? '').slice(0, 60),
    question: String(snapshot.question ?? '').slice(0, 1000),
    cards: (snapshot.cards ?? []).slice(0, 10).map(card => ({
      id: String(card.id), reverse: Boolean(card.reverse), position: String(card.position ?? '').slice(0, 60),
    })),
    feedback: savedFeedback(snapshot.feedback, snapshot.cards?.length ?? 0),
  } : null;
  if (context && (context.cards.some(card => !/^(major|wands|cups|swords|pentacles)-\d{1,2}$/.test(card.id)) || JSON.stringify(context).length > 24000)) throw new Error('记录的牌阵格式不正确。');
  return { id, title: title.trim() || (context?.question?.slice(0, 50) || '未命名笔记'), body, kind, snapshot: context,
    createdAt: now, updatedAt: now, trashedAt: null };
}

export function filterNotes(notes, { query = '', kind = 'all', trash = false } = {}) {
  const term = query.trim().toLocaleLowerCase();
  return notes.filter(note => Boolean(note.trashedAt) === trash && (kind === 'all' || note.kind === kind) &&
    [note.title, note.body, note.snapshot?.question, note.snapshot?.spreadName].join(' ').toLocaleLowerCase().includes(term))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

