import { validateGrade, validateInterpretation } from './ai-contract.js?v=cdac01788a19';
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

export function createLocalNotesStore(storage, key = 'moonlit-notes-v1') {
  function read() {
    let stored;
    try { stored = storage.getItem(key); }
    catch { throw new Error('浏览器不允许保存笔记，请检查存储权限。'); }
    if (!stored) return [];
    try {
      const value = JSON.parse(stored);
      if (value.version !== 1 || !Array.isArray(value.notes) || value.notes.length > NOTE_LIMIT) throw new Error();
      return value.notes.map(note => ({ ...createNote(note, note.createdAt), updatedAt: note.updatedAt, trashedAt: note.trashedAt ?? null }));
    } catch { throw new Error('本机笔记无法读取，原记录已保留。'); }
  }
  return {
    async list() { return read(); },
    async save(note) {
      const entries = read();
      const index = entries.findIndex(entry => entry.id === note.id);
      const clean = createNote(note, note.createdAt);
      const saved = { ...clean, createdAt: index < 0 ? clean.createdAt : entries[index].createdAt, updatedAt: new Date().toISOString(), trashedAt: note.trashedAt ?? null };
      if (index < 0) entries.push(saved); else entries[index] = saved;
      if (entries.length > NOTE_LIMIT) throw new Error(`本机笔记最多保存 ${NOTE_LIMIT} 条，请先导出整理。`);
      try { storage.setItem(key, JSON.stringify({ version: 1, notes: entries })); }
      catch { throw new Error('保存失败，浏览器空间可能不足。请先复制文字或导出已有笔记。'); }
      return saved;
    },
  };
}
