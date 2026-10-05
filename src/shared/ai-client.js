import { hostedEndpoint, requireAIInvite, clearAIInvite } from './ai-access.js?v=2fc853de6c13';

/** Hosted requests use an invite; the OpenAI credential never enters the browser. */
export async function requestAI(endpoint, input, signal) {
  const hosted = document.querySelector('meta[name="tarot-ai-mode"]')?.content === 'hosted-api';
  const headers = { 'Content-Type': 'application/json' };
  if (hosted) headers.Authorization = `Bearer ${await requireAIInvite(signal)}`;
  let response;
  try {
    response = await fetch(hosted ? hostedEndpoint(endpoint) : `/api/${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input),
      signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
    });
  } catch {
    if (signal.aborted) throw new DOMException('已取消', 'AbortError');
    throw new Error('暂时无法获取反馈，请检查网络后重试。');
  }
  const value = await response.json().catch(() => null);
  if (hosted && response.status === 401) clearAIInvite();
  if (!response.ok) throw new Error(typeof value?.error === 'string' ? value.error : 'AI 服务暂时不可用，请稍后重试。');
  if (!value) throw new Error('反馈格式不完整，请重试。');
  return value;
}
