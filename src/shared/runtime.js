/** Build metadata controls available services; a static copy must never advertise local AI. */
export function runtimeCapabilities(mode) {
  return { aiAvailable: ['local-codex', 'hosted-api'].includes(mode), local: mode === 'local-codex' };
}

export function configureRuntime(document) {
  const mode = document.querySelector('meta[name="tarot-ai-mode"]')?.content;
  const capabilities = runtimeCapabilities(mode);
  document.querySelector('#grade-practice').hidden = !capabilities.aiAvailable;
  const scenarioButton = document.querySelector('#ai-new-practice');
  if (scenarioButton) scenarioButton.hidden = !capabilities.aiAvailable;
  for (const note of document.querySelectorAll('.ai-note')) {
    note.hidden = !capabilities.aiAvailable;
    if (capabilities.aiAvailable && !capabilities.local) note.textContent = 'AI 反馈供学习参考，合理的不同解释也可以得分。';
  }
  if (!capabilities.aiAvailable) {
    document.querySelector('#practice .intro').textContent = '根据题目写下自己的解读，再对照参考说明与自查提示。';
  }
  return capabilities;
}
