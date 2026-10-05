/** Same-origin requests contain only the question, card IDs and interpretation. */
export async function requestAI(endpoint, input, signal) {
  let response;
  try {
    response = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
    });
  } catch {
    if (signal.aborted) throw new DOMException('已取消', 'AbortError');
    throw new Error('暂时无法获取反馈，请检查网络后重试。');
  }
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new Error(typeof value?.error === 'string' ? value.error : 'AI 服务暂时不可用，请稍后重试。');
  if (!value) throw new Error('反馈格式不完整，请重试。');
  return value;
}
