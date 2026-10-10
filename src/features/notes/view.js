import { element, escapeHTML as html } from '../../shared/dom.js?v=5cfbefc47f66';
import { filterNotes } from '../../core/notes.js?v=5cfbefc47f66';
import { renderNoteContext } from './record-view.js?v=5cfbefc47f66';

export const NOTE_KIND_NAMES = Object.freeze({ study: '学习笔记', draw: '抽牌记录', practice: '练习记录' });

export function createNotesView(cards) {
  const byId = new Map(cards.map(card => [card.id, card]));
  const title = element('#note-title');
  const body = element('#note-body');
  const kind = element('#note-kind');
  const date = value => new Date(value).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });

  function renderList(notes, selectedId) {
    const filter = element('#notes-filter').value;
    document.querySelectorAll('[data-notes-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.notesFilter === filter)));
    const matches = filterNotes(notes, { query: element('#notes-search').value, kind: filter === 'trash' ? 'all' : filter, trash: filter === 'trash' });
    element('#notes-count').textContent = `${matches.length} 条${filter === 'trash' ? '已移出的记录' : '记录'}`;
    element('#notes-list').innerHTML = matches.length ? matches.map(note => `<button class="note-list-item ${note.id === selectedId ? 'selected' : ''}" data-note-id="${html(note.id)}" aria-pressed="${note.id === selectedId}"><span class="note-kind">${NOTE_KIND_NAMES[note.kind]} · ${date(note.updatedAt)}</span><b>${html(note.title)}</b><p>${html((note.body || note.snapshot?.question || '还没有补充文字').slice(0, 75))}</p></button>`).join('') : '<p class="notes-empty">还没有记录。可以写一篇笔记，或保存一次抽牌与练习。</p>';
  }

  function renderEditor(note, saved = false) {
    title.value = note?.title ?? '';
    body.value = note?.body ?? '';
    setKind(note?.kind ?? 'study', Boolean(note?.snapshot || note?.trashedAt));
    element('#note-editor-heading').textContent = note ? NOTE_KIND_NAMES[note.kind] : '写一篇笔记';
    element('#note-updated').textContent = saved ? `最近保存：${date(note.updatedAt)}` : '写完后，记得保存这一页。';
    element('#note-trash').hidden = !saved;
    element('#note-trash').textContent = note?.trashedAt ? '恢复记录' : '移入废纸篓';
    element('#note-save').disabled = Boolean(note?.trashedAt);
    title.disabled = body.disabled = Boolean(note?.trashedAt);
    const snapshot = note?.snapshot;
    const section = element('#note-context');
    section.hidden = !snapshot;
    section.innerHTML = renderNoteContext(snapshot, byId);
  }

  function setKind(value, locked = false) {
    kind.value = value;
    document.querySelectorAll('[data-note-kind]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.noteKind === value));
      button.disabled = locked;
    });
  }

  return { renderList, renderEditor, setKind, values: () => ({ title: title.value, body: body.value, kind: kind.value }),
    message(text) { element('#note-message').textContent = text; element('#notes-shelf-message').textContent = text; },
  };
}
