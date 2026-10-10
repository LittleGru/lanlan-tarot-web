import { createNote } from '../../core/notes.js?v=5cfbefc47f66';

const decode = row => ({ id: row.id, title: row.title, body: row.body, kind: row.kind, snapshot: row.snapshot,
  createdAt: row.created_at, updatedAt: row.updated_at, trashedAt: row.trashed_at });

/** RLS is the security boundary; owner filters also keep queries narrow. */
export function createCloudNotesStore(client, userId) {
  if (!userId) throw new Error('请先登录。');
  return {
    async list() {
      const { data, error } = await client.from('tarot_notes').select('*').eq('owner_id', userId).order('updated_at', { ascending: false }).limit(300);
      if (error) throw new Error('云端笔记读取失败，请稍后重试。');
      return data.map(decode);
    },
    async save(note) {
      const clean = createNote(note, note.createdAt);
      const { data, error } = await client.from('tarot_notes').upsert({ id: clean.id, owner_id: userId,
        title: clean.title, body: clean.body, kind: clean.kind, snapshot: clean.snapshot,
        created_at: clean.createdAt, trashed_at: note.trashedAt ?? null,
      }, { onConflict: 'owner_id,id' }).select().single();
      if (error) throw new Error('云端保存失败，文字仍保留在编辑框中。请稍后重试。');
      return decode(data);
    },
  };
}
