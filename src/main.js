import { loadCatalog } from './shared/catalog-loader.js?v=5cfbefc47f66';
import { element } from './shared/dom.js?v=5cfbefc47f66';
import { createNavigation } from './shared/navigation.js?v=5cfbefc47f66';
import { mountCardDialog } from './shared/card-dialog.js?v=5cfbefc47f66';
import { mountDraw } from './features/draw/controller.js?v=5cfbefc47f66';
import { mountLibrary } from './features/library/controller.js?v=5cfbefc47f66';
import { mountPractice } from './features/practice/controller.js?v=5cfbefc47f66';
import { registerTarotTools } from './integrations/webmcp.js?v=5cfbefc47f66';
import { configureRuntime } from './shared/runtime.js?v=5cfbefc47f66';
import { mountAIAccess } from './shared/ai-access.js?v=5cfbefc47f66';
import { mountSpreadPicker } from './shared/spread-picker.js?v=5cfbefc47f66';
import { mountNotes } from './features/notes/controller.js?v=5cfbefc47f66';

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
  let navigation;
  const notes = mountNotes({ cards: catalog.cards, signal });
  // Cloud account restoration must not hold up drawing, learning or navigation.
  notes.initialize();
  const draw = mountDraw({ ...catalog, signal, aiAvailable, onSave: notes.saveSnapshot });
  const library = mountLibrary({ cards: catalog.cards, guides: catalog.guides, signal });
  const practice = mountPractice({
    cards: catalog.cards,
    spreads: catalog.spreads,
    scenarios: catalog.scenarios,
    includeReversed: () => draw.includeReversed,
    signal,
    aiAvailable,
    onSave: notes.saveSnapshot,
  });
  mountSpreadPicker({ spreads: catalog.spreads, signal });
  navigation = createNavigation({
    signal,
    onEnter(page) {
      if (page === 'learn') library.enter();
      if (page === 'practice') practice.enter();
      if (page === 'notes') notes.enter();
    },
  });
  mountCardDialog(catalog.cards, signal, { guides: catalog.guides, onNote: notes.newStudy });
  registerTarotTools({ spreads: catalog.spreads, draw, practice, navigation }, signal);
}

startApplication().catch(error => {
  element('#spread-select').innerHTML = '<option>资料暂时无法加载</option>';
  element('#spread-select').disabled = true;
  element('#draw-button').disabled = true;
  element('#draw-caption').textContent = '学习资料暂时没有加载，请刷新页面再试。';
  console.error('网站初始化失败', error);
});
