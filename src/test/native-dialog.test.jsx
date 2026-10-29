import { afterEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
const platform = vi.hoisted(() => ({ native: true }));
vi.mock('../native-notifications', () => ({ isNative: () => platform.native }));
import { Dialog } from '../components/EntryDialog';

afterEach(() => { document.querySelector('meta[name="viewport"]')?.remove(); platform.native = true; });
it('uses a full-screen APK form and restores the desktop viewport on exit', () => {
  const viewport = document.createElement('meta'); viewport.name = 'viewport'; viewport.content = 'width=1200, initial-scale=0.33'; document.head.append(viewport);
  const { unmount } = render(<Dialog onClose={vi.fn()}><h2>Add a transaction</h2></Dialog>);
  expect(document.querySelector('dialog').classList.contains('native-form-page')).toBe(true);
  expect(viewport.content).toContain('width=device-width');
  expect(screen.getByRole('button', { name: 'Back to diary' })).toBeTruthy();
  unmount();
  expect(viewport.content).toBe('width=1200, initial-scale=0.33');
});
it('retains the ordinary browser dialog', () => {
  platform.native = false;
  render(<Dialog onClose={vi.fn()}><h2>Add a goal</h2></Dialog>);
  expect(document.querySelector('dialog').classList.contains('native-form-page')).toBe(false);
  expect(screen.getByRole('button', { name: 'Close dialog' })).toBeTruthy();
});
