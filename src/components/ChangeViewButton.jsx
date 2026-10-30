import { useState } from 'react';
import { readViewMode, saveViewMode } from '../view-mode';

export default function ChangeViewButton({ onClose, notify }) {
  const [mode, setMode] = useState(readViewMode);
  function change() {
    const next = mode === 'desktop' ? 'normal' : 'desktop';
    try { saveViewMode(next); setMode(next); onClose(); }
    catch { notify('Could not save the view preference. Check device storage.'); }
  }
  return <button type="button" aria-pressed={mode === 'desktop'} title={`Switch to ${mode === 'desktop' ? 'normal' : 'desktop'} view`} onClick={change}>Change view · {mode === 'desktop' ? 'Desktop' : 'Normal'}</button>;
}
