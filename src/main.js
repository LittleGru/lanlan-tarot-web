import { loadCatalog } from './shared/catalog-loader.js';
import { element } from './shared/dom.js';
import { createNavigation } from './shared/navigation.js';
import { mountCardDialog } from './shared/card-dialog.js';
import { mountDraw } from './features/draw/controller.js';
import { mountLibrary } from './features/library/controller.js';
import { mountPractice } from './features/practice/controller.js';
import { registerTarotTools } from './integrations/webmcp.js';
import { configureRuntime } from './shared/runtime.js';

async function startApplication() {
  const lifetime = new AbortController();
  // A cached page resumes with its existing controllers and listeners intact.
  window.addEventListener('pagehide', event => {
    if (!event.persisted) lifetime.abort();
  }, { signal: lifetime.signal });
  const signal = lifetime.signal;
  const catalog = await loadCatalog();
  if (signal.aborted) return;

  const { aiAvailable } = configureRuntime(document);
  const draw = mountDraw({ ...catalog, signal, aiAvailable });
  const library = mountLibrary({ cards: catalog.cards, signal });
  const practice = mountPractice({
    cards: catalog.cards,
    scenarios: catalog.scenarios,
    includeReversed: () => draw.includeReversed,
    signal,
    aiAvailable,
  });
  const navigation = createNavigation({
    signal,
    onEnter(page) {
      if (page === 'learn') library.enter();
      if (page === 'practice') practice.enter();
    },
  });
  mountCardDialog(catalog.cards, signal);
  registerTarotTools({ spreads: catalog.spreads, draw, practice, navigation }, signal);
}

startApplication().catch(error => {
  element('#spread-select').innerHTML = '<option>资料暂时无法加载</option>';
  element('#spread-select').disabled = true;
  element('#draw-button').disabled = true;
  element('#draw-caption').textContent = '学习资料暂时没有加载，请刷新页面再试。';
  console.error('网站初始化失败', error);
});
