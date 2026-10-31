let current = null;
export function clearCelebration() {
  if (!current) return;
  clearTimeout(current.timer);
  for (const animation of current.animations) animation.cancel();
  current.layer.remove(); current = null;
}
export function celebrateGoal(element) {
  clearCelebration();
  if (!element || !element.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const rect = element.getBoundingClientRect(), layer = document.createElement('div');
  layer.className = 'goal-celebration'; layer.setAttribute('aria-hidden', 'true');
  const state = { layer, animations: [], timer: null }; current = state;
  document.body.append(layer);
  for (let i = 0; i < 24; i++) {
    const dot = document.createElement('i'), angle = i / 24 * Math.PI * 2;
    const velocity = 90 + Math.random() * 70;
    dot.style.left = `${rect.left + rect.width / 2}px`;
    dot.style.top = `${rect.top + rect.height / 2}px`;
    layer.append(dot);
    const frames = Array.from({ length: 25 }, (_, step) => {
      const t = step / 24 * 1.2;
      return { offset: step / 24, opacity: t < .7 ? 1 : Math.max(0, (1.2 - t) / .5), transform: `translate(${Math.cos(angle) * velocity * t}px,${Math.sin(angle) * velocity * t + 60 * t * t}px) scale(${1 - .3 * t / 1.2})` };
    });
    state.animations.push(dot.animate(frames, { duration: 1200, easing: 'linear', fill: 'forwards' }));
  }
  state.timer = setTimeout(clearCelebration, 1250);
}
