export const viewModeKey = 'maikal-view-mode';
export function readViewMode() {
  try { return localStorage.getItem(viewModeKey) === 'desktop' ? 'desktop' : 'normal'; }
  catch { return 'normal'; }
}
export function applyViewMode(mode) {
  const viewport = document.querySelector('meta[name="viewport"]');
  const physicalWidth = (window.visualViewport?.width || window.innerWidth || 1200) * (window.visualViewport?.scale || 1);
  const scale = Math.min(1, physicalWidth / 1200);
  document.documentElement.dataset.maikalView = mode;
  viewport?.setAttribute('content', mode === 'desktop'
    ? `width=1200, initial-scale=${scale}, minimum-scale=0.1, maximum-scale=5, user-scalable=yes`
    : 'width=device-width, initial-scale=1, minimum-scale=0.5, maximum-scale=5, user-scalable=yes');
}
export function saveViewMode(mode) {
  localStorage.setItem(viewModeKey, mode);
  applyViewMode(mode);
}
