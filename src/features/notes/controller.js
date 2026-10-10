import { createNote, createLocalNotesStore } from '../../core/notes.js?v=cdac01788a19';
import { element, listen } from '../../shared/dom.js?v=cdac01788a19';
import { createNotesView } from './view.js?v=cdac01788a19';
import { createNotesAuth } from './auth.js?v=cdac01788a19';
import { createCloudNotesStore } from './cloud-store.js?v=cdac01788a19';

export function mountNotes({ cards, signal, onNavigate }) {
  const local = createLocalNotesStore(localStorage);
  const view = createNotesView(cards);
  let store = local;
  let records = [];
  let current = null;
  let dirty = false;
  let auth = null;
  let user = null;
  let revision = 0;
  const drafts = new Map();
  const login = element('#notes-login');
  const logout = element('#notes-logout');
  const scope = () => user?.id ?? 'local';

  function choose(note = null) {
    current = note;
    dirty = false;
    view.renderEditor(current);
    view.renderList(records, current?.id);
  }

  async function refresh() {
    const expected = revision;
    try {
      const value = await store.list();
      if (expected !== revision) return;
      records = value;
      view.renderList(records, current?.id);
    } catch (error) { if (expected === revision) view.message(error.message); }
  }

  async function persist(note = null) {
    const expected = revision;
    const next = note ?? { ...(current ?? createNote({})), ...view.values() };
    const saved = await store.save(next);
    if (expected !== revision) return saved;
    const index = records.findIndex(item => item.id === saved.id);
    if (index < 0) records.unshift(saved); else records[index] = saved;
    choose(saved);
    view.message(user ? '已保存到你的个人笔记。' : '已保存在这台设备的浏览器中。');
    return saved;
  }

  function mayReplace() { return !dirty || window.confirm('当前修改还没有保存。要离开这篇笔记吗？'); }

  async function switchAccount(nextUser, client) {
    if (nextUser?.id === user?.id && (nextUser || store === local)) return;
    if (dirty) drafts.set(scope(), { ...(current ?? createNote({})), ...view.values() });
    user = nextUser;
    revision += 1;
    store = user ? createCloudNotesStore(client, user.id) : local;
    records = [];
    choose(drafts.get(scope()) ?? null);
    if (drafts.has(scope())) { dirty = true; view.message('已恢复上次尚未保存的草稿。'); }
    element('#notes-storage').textContent = user ? `个人云端笔记 · ${user.email ?? ''}` : '本机笔记 · 仅保存在当前浏览器';
    login.hidden = Boolean(user);
    logout.hidden = !user;
    element('#notes-import').hidden = !user;
    await refresh();
  }

  async function busy(button, task) {
    button.disabled = true;
    try { return await task(); }
    catch (error) { view.message(error.message); }
    finally { button.disabled = false; }
  }

  listen(element('#note-form'), 'submit', event => {
    event.preventDefault();
    busy(element('#note-save'), () => persist());
  }, signal);
  listen(element('#note-form'), 'input', () => { dirty = true; view.message('有未保存的修改。'); }, signal);
  listen(element('#new-note'), 'click', () => { if (mayReplace()) { choose(); view.message(''); element('#note-title').focus(); } }, signal);
  listen(element('#notes-list'), 'click', event => {
    const button = event.target.closest('[data-note-id]');
    if (button && mayReplace()) { choose(records.find(note => note.id === button.dataset.noteId)); view.message(''); }
  }, signal);
  listen(element('#notes-search'), 'input', () => view.renderList(records, current?.id), signal);
  listen(element('#notes-filter'), 'change', () => view.renderList(records, current?.id), signal);
  listen(element('#note-trash'), 'click', () => busy(element('#note-trash'), async () => {
    if (!current || !mayReplace()) return;
    const restoring = Boolean(current.trashedAt);
    await persist({ ...current, trashedAt: restoring ? null : new Date().toISOString() });
    element('#notes-filter').value = restoring ? 'all' : 'trash';
    view.renderList(records, current?.id);
    view.message(restoring ? '记录已恢复。' : '已移入废纸篓，可以随时恢复。');
  }), signal);
  listen(element('#notes-export'), 'click', () => {
    const blob = new Blob([JSON.stringify({ version: 1, notes: records }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `moonlit-notes-${new Date().toISOString().slice(0, 10)}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, signal);
  listen(login, 'click', () => { element('#notes-auth-dialog').showModal(); }, signal);
  listen(element('#notes-auth-close'), 'click', () => element('#notes-auth-dialog').close(), signal);
  listen(element('#notes-auth-form'), 'submit', event => {
    event.preventDefault();
    const button = element('#notes-auth-submit');
    button.disabled = true;
    (async () => {
      try {
        if (dirty) await persist();
        if (!auth) throw new Error('邮箱登录暂未开放，笔记仍可保存在这台设备。');
        await auth.signIn(element('#notes-email').value.trim());
        element('#notes-auth-message').textContent = '登录链接已发送，请查看邮箱并点击链接。';
      } catch (error) { element('#notes-auth-message').textContent = error.message; }
      finally { button.disabled = false; }
    })();
  }, signal);
  listen(logout, 'click', () => busy(logout, async () => {
    if (dirty) await persist();
    await auth.signOut();
  }), signal);
  listen(element('#notes-import'), 'click', () => busy(element('#notes-import'), async () => {
    if (!user) return;
    const ownStore = store;
    const entries = await local.list();
    const existingIds = new Set(records.map(note => note.id));
    let count = 0;
    for (const note of entries.filter(item => !existingIds.has(item.id))) {
      if (store !== ownStore) break;
      await ownStore.save(note); count += 1;
    }
    await refresh();
    view.message(`已将 ${count} 条本机笔记复制到当前账号；本机原记录仍保留。`);
  }), signal);
  listen(window, 'beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }, signal);
  choose();

  return {
    async initialize() {
      try {
        auth = await createNotesAuth(document, switchAccount);
        login.hidden = !auth;
        if (auth?.user) await switchAccount(auth.user, auth.client);
        signal.addEventListener('abort', () => auth?.dispose(), { once: true });
      } catch (error) { view.message(error.message); login.hidden = true; }
      await refresh();
    },
    enter: refresh,
    async saveSnapshot(snapshot, body = '') {
      const expected = revision;
      if (dirty) await persist();
      if (expected !== revision) throw new Error('登录状态已变化，请重新保存这次记录。');
      const existing = records.find(note => note.id === snapshot.id);
      const note = createNote({ id: snapshot.id, title: existing?.title ?? snapshot.question.slice(0, 120),
        body: existing?.body && snapshot.kind === 'draw' ? existing.body : body, kind: snapshot.kind, snapshot });
      const saved = await persist({ ...note, createdAt: existing?.createdAt ?? note.createdAt });
      if (expected !== revision) return;
      element('#notes-filter').value = 'all'; element('#notes-search').value = '';
      choose(saved); onNavigate('notes');
    },
    newStudy(card, reverse = false) {
      if (!mayReplace()) return;
      choose(createNote({ title: `${card.name} · 学习笔记`, snapshot: { cards: [{ id: card.id, reverse }], question: '', spreadName: '牌义学习' } }));
      dirty = true; onNavigate('notes'); element('#note-body').focus();
    },
  };
}
