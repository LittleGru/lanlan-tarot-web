import { loadCatalog } from './shared/catalog-loader.js?v=6fd9138dc4fb';
import { element } from './shared/dom.js?v=6fd9138dc4fb';
import { createNavigation } from './shared/navigation.js?v=6fd9138dc4fb';
import { mountCardDialog } from './shared/card-dialog.js?v=6fd9138dc4fb';
import { mountDraw } from './features/draw/controller.js?v=6fd9138dc4fb';
import { mountLibrary } from './features/library/controller.js?v=6fd9138dc4fb';
import { mountPractice } from './features/practice/controller.js?v=6fd9138dc4fb';
import { registerTarotTools } from './integrations/webmcp.js?v=6fd9138dc4fb';
import { configureRuntime } from './shared/runtime.js?v=6fd9138dc4fb';
import { mountAIAccess } from './shared/ai-access.js?v=6fd9138dc4fb';

async function startApplication() {
  const lifetime = new AbortController();
  // A cached page resumes with its existing controllers and listeners intact.
  window.addEventListener('pagehide', event => {
    if (!event.persisted) lifetime.abort();
  }, { signal: lifetime.signal });
  const signal = lifetime.signal;
  const assetVersion = document.querySelector('meta[name="tarot-assets-version"]')?.content;
  const catalog = await loadCatalog(path => fetch(assetVersion ? `${path}?v=${assetVersion}` : path));
  if (signal.aborted) return;

  const { aiAvailable } = configureRuntime(document);
  mountAIAccess(document, signal);
  const draw = mountDraw({ ...catalog, signal, aiAvailable });
  const library = mountLibrary({ cards: catalog.cards, signal });
  const practice = mountPractice({
    cards: catalog.cards,
    spreads: catalog.spreads,
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
