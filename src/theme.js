import { Capacitor, registerPlugin } from '@capacitor/core';
const bridge = registerPlugin('DiaryAlarms');
export const themeKey = 'mantra-theme';
export function readTheme() { try { const value=localStorage.getItem(themeKey);return ['light','dark','system'].includes(value)?value:'system'; } catch { return 'system'; } }
export function applyTheme(value=readTheme()) {
  const dark=value==='dark'||(value==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme=dark?'dark':'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#182126':'#faf8ef');
  if(Capacitor.isNativePlatform()) bridge.setTheme({theme:value}).catch(()=>{});
}
export function saveTheme(value) { localStorage.setItem(themeKey,value);applyTheme(value);window.dispatchEvent(new Event('mantra-theme-change')); }
export function startTheme() { applyTheme();const media=window.matchMedia('(prefers-color-scheme: dark)');media.addEventListener('change',()=>applyTheme()); }
