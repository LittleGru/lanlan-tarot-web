/** The public project key is safe only with the accompanying database RLS migration. */
export async function createNotesAuth(document, onChange) {
  const url = document.querySelector('meta[name="tarot-supabase-url"]')?.content;
  const key = document.querySelector('meta[name="tarot-supabase-key"]')?.content;
  if (!url || !key) return null;
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !(key.startsWith('sb_publishable_') || key.startsWith('eyJ'))) throw new Error('个人笔记登录配置无效。');
  const { createClient } = await import('../../vendor/supabase.js');
  const client = createClient(url, key, { auth: { storageKey: 'moonlit-notes-session', detectSessionInUrl: true } });
  const callback = location.hash.includes('access_token=');
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error('登录状态无法读取，请重新登录。');
  if (callback) history.replaceState(null, '', '#/notes');
  // Auth callbacks must not await another Supabase operation inside its session lock.
  const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => onChange(session?.user ?? null, client), 0);
  });
  return { client, user: data.session?.user ?? null, dispose: () => subscription.subscription.unsubscribe(),
    async signIn(email) {
      const redirect = `${location.origin}${location.pathname}`;
      const { error: signInError } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } });
      if (signInError) throw new Error('登录邮件暂时未能发送，请检查邮箱或稍后重试。');
    },
    async signOut() {
      const { error: signOutError } = await client.auth.signOut({ scope: 'local' });
      if (signOutError) throw new Error('暂时无法退出登录，请重试。');
    },
  };
}
