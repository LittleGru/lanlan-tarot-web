import { confirmAction } from '../../shared/confirmation.js?v=5cfbefc47f66';
import { createNote } from '../../core/notes.js?v=5cfbefc47f66';
import { element, listen } from '../../shared/dom.js?v=5cfbefc47f66';
import { createNotesView } from './view.js?v=5cfbefc47f66';
import { createNotesAuth } from './auth.js?v=5cfbefc47f66';
import { createCloudNotesStore } from './cloud-store.js?v=5cfbefc47f66';

export function mountNotes({ cards, signal }) {
  const view = createNotesView(cards);
  let store = null;
  let records = [];
  let current = null;
  let dirty = false;
  let auth = null;
  let user = null;
  let revision = 0;
  const drafts = new Map();
  const login = element('#notes-login');
  const logout = element('#notes-logout');
  const scope = () => user?.id ?? 'signed-out';
  let pendingAction = null;
  const notebook = element('#notebook-dialog');
  const unsavedDialog = element('#notebook-unsaved');

  function requireLogin(action) {
    if (user && store) return true;
    pendingAction = action;
    element('#notes-auth-message').textContent = auth ? '输入邮箱，我们会发送登录链接。登录后继续刚才的记录。' : '登录服务正在加载，请稍后再试。';
    element('#notes-auth-dialog').showModal();
    element('#notes-email').focus();
    return false;
  }

  function updateAccountView() {
    element('#notes-storage').textContent = user ? `个人云端笔记 · ${user.email ?? ''}` : '登录后查看你的云端笔记';
    login.hidden = true;
    element('#new-note').hidden = !user;
    element('.header-account').textContent = user ? '我的账户' : '邮箱登录';
    logout.hidden = !user;
    element('.notes-shelf').hidden = !user;
    element('#notes-signed-out').hidden = Boolean(user);
    element('#notes-export').hidden = !user;
    element('#notes-resume').hidden = !user || !dirty;
    element('#notes-auth-submit').disabled = !auth;
  }

  async function newNote() {
    if (!requireLogin(newNote) || !await mayReplace()) return;
    choose(); view.message(''); openNotebook(); element('#note-title').focus();
  }

  function openNotebook() {
    if (!notebook.open) notebook.showModal();
    element('#note-body').focus({ preventScroll: window.innerWidth > 650 });
  }

  function closeNotebook() {
    if (dirty) {
      element('#notebook-close-message').textContent = '';
      if (!unsavedDialog.open) unsavedDialog.showModal();
      element('#notebook-keep').focus();
      return;
    }
    notebook.close();
  }

  function choose(note = null) {
    current = note;
    dirty = false;
    element('#notes-resume').hidden = true;
    if (unsavedDialog.open) unsavedDialog.close();
    view.renderEditor(current, records.some(record => record.id === current?.id));
    view.renderList(records, current?.id);
  }

  async function refresh() {
    if (!store || !user) return;
    const expected = revision;
    try {
      const value = await store.list();
      if (expected !== revision) return;
      records = value;
      view.renderList(records, current?.id);
    } catch (error) { if (expected === revision) view.message(error.message); }
  }

  async function persist(note = null) {
    if (!store || !user) throw new Error('请先登录，再保存到云端笔记。');
    const expected = revision;
    const next = note ?? { ...(current ?? createNote({})), ...view.values() };
    const saved = await store.save(next);
    if (expected !== revision) return saved;
    const index = records.findIndex(item => item.id === saved.id);
    if (index < 0) records.unshift(saved); else records[index] = saved;
    choose(saved);
    view.message('已保存到你的云端笔记。');
    return saved;
  }

  async function mayReplace() {
    return !dirty || await confirmAction({ title: '切换到另一篇笔记？', message: '当前修改还没有保存。切换后将放弃这些修改。', confirmLabel: '放弃并切换', cancelLabel: '继续写' });
  }

  async function switchAccount(nextUser, client) {
    if (nextUser?.id === user?.id && (nextUser || store === null)) return;
    if (dirty) drafts.set(scope(), { ...(current ?? createNote({})), ...view.values() });
    user = nextUser;
    revision += 1;
    store = user ? createCloudNotesStore(client, user.id) : null;
    records = [];
    choose(drafts.get(scope()) ?? null);
    if (drafts.has(scope())) { dirty = true; view.message('已恢复上次尚未保存的草稿。'); }
    if (!user && notebook.open) notebook.close();
    updateAccountView();
    await refresh();
    if (user && pendingAction) {
      const action = pendingAction;
      pendingAction = null;
      element('#notes-auth-dialog').close();
      try { await action(); } catch (error) { view.message(error.message); }
    }
  }

  async function busy(button, task) {
    button.disabled = true;
    try { return await task(); }
    catch (error) {
      view.message(error.message);
      if (unsavedDialog.open) element('#notebook-close-message').textContent = error.message;
    }
    finally { button.disabled = false; }
  }

  listen(element('#note-form'), 'submit', event => {
    event.preventDefault();
    busy(element('#note-save'), () => persist());
  }, signal);
  listen(element('#note-form'), 'input', () => { dirty = true; element('#notes-resume').hidden = !user; view.message('有未保存的修改。'); }, signal);
  listen(element('#new-note'), 'click', newNote, signal);
  listen(element('#notes-resume'), 'click', openNotebook, signal);
  listen(element('#notes-list'), 'click', async event => {
    const button = event.target.closest('[data-note-id]');
    if (button && await mayReplace()) { choose(records.find(note => note.id === button.dataset.noteId)); view.message(''); openNotebook(); }
  }, signal);
  listen(element('#notes-search'), 'input', () => view.renderList(records, current?.id), signal);
  listen(element('.notes-filter-tabs'), 'click', event => {
    const button = event.target.closest('[data-notes-filter]');
    if (!button) return;
    element('#notes-filter').value = button.dataset.notesFilter;
    view.renderList(records, current?.id);
  }, signal);
  listen(element('.note-kind-tabs'), 'click', event => {
    const button = event.target.closest('[data-note-kind]');
    if (!button || button.disabled) return;
    view.setKind(button.dataset.noteKind);
    dirty = true; element('#notes-resume').hidden = !user; view.message('有未保存的修改。');
  }, signal);
  listen(element('#notebook-close'), 'click', closeNotebook, signal);
  listen(element('#notebook-keep'), 'click', () => {
    if (unsavedDialog.open) unsavedDialog.close();
    element('#note-body').focus();
  }, signal);
  listen(element('#notebook-discard'), 'click', () => { choose(current); view.message(''); notebook.close(); }, signal);
  listen(element('#notebook-save-close'), 'click', () => busy(element('#notebook-save-close'), async () => {
    await persist(); if (unsavedDialog.open) unsavedDialog.close(); notebook.close();
  }), signal);
  listen(unsavedDialog, 'cancel', event => { event.preventDefault(); unsavedDialog.close(); element('#note-body').focus(); }, signal);
  listen(notebook, 'cancel', event => { event.preventDefault(); closeNotebook(); }, signal);
  listen(notebook, 'click', event => {
    if (event.target !== notebook) return;
    const bounds = notebook.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeNotebook();
  }, signal);
  listen(element('#note-trash'), 'click', () => busy(element('#note-trash'), async () => {
    if (!current) return;
    const restoring = Boolean(current.trashedAt);
    if (dirty) {
      if (!await confirmAction({ title: '先保存修改？', message: '保存当前修改后，再将笔记移入废纸篓。以后仍可恢复。', confirmLabel: '保存并移入废纸篓', cancelLabel: '继续写' })) return;
      await persist();
    }
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
  listen(login, 'click', () => requireLogin(null), signal);
  listen(element('#notes-start-login'), 'click', () => requireLogin(null), signal);
  listen(element('#notes-auth-dialog'), 'cancel', () => { pendingAction = null; }, signal);
  listen(element('#notes-auth-close'), 'click', () => { pendingAction = null; element('#notes-auth-dialog').close(); }, signal);
  listen(element('#notes-auth-form'), 'submit', event => {
    event.preventDefault();
    const button = element('#notes-auth-submit');
    button.disabled = true;
    (async () => {
      try {
        if (dirty) await persist();
        if (!auth) throw new Error('邮箱登录暂未开放，请稍后再试。');
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
  listen(window, 'beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }, signal);
  choose();
  updateAccountView();

  async function saveSnapshot(snapshot, body = '') {
    if (!requireLogin(() => saveSnapshot(snapshot, body))) return;
    const expected = revision;
    if (dirty) await persist();
    if (expected !== revision) throw new Error('登录状态已变化，请重新保存这次记录。');
    const existing = records.find(note => note.id === snapshot.id);
    const note = createNote({ id: snapshot.id, title: existing?.title ?? snapshot.question.slice(0, 120),
      body: existing?.body && snapshot.kind === 'draw' ? existing.body : body, kind: snapshot.kind, snapshot });
    const saved = await persist({ ...note, createdAt: existing?.createdAt ?? note.createdAt });
    if (expected !== revision) return;
    element('#notes-filter').value = 'all'; element('#notes-search').value = '';
    choose(saved); openNotebook();
  }

  async function newStudy(card, reverse = false) {
    if (!requireLogin(() => newStudy(card, reverse)) || !await mayReplace()) return;
    choose(createNote({ title: `${card.name} · 学习笔记`, snapshot: { cards: [{ id: card.id, reverse }], question: '', spreadName: '牌义学习' } }));
    view.message(''); openNotebook();
  }

  return {
    async initialize() {
      try {
        auth = await createNotesAuth(document, switchAccount);
        updateAccountView();
        if (auth?.user) await switchAccount(auth.user, auth.client);
        signal.addEventListener('abort', () => auth?.dispose(), { once: true });
      } catch (error) { view.message(error.message); element('#notes-auth-message').textContent = error.message; updateAccountView(); }
      await refresh();
    },
    enter: refresh,
    saveSnapshot,
    newStudy,
  };
}
