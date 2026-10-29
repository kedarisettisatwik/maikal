import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ snapshot: vi.fn(), setDoc: vi.fn() }));
vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({ collection: vi.fn(), doc: vi.fn(), onSnapshot: mocks.snapshot, query: vi.fn(), setDoc: mocks.setDoc, where: vi.fn() }));
import useRecords from '../useRecords';
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
it('persists local edits across remounts with no Firestore connection', () => {
  const { result, unmount } = renderHook(() => useRecords('local', vi.fn()));
  act(() => result.current.save({ id: 'g1', type: 'goal', title: 'Read' }));
  expect(result.current.status).toBe('Saved on this device');
  expect(mocks.snapshot).not.toHaveBeenCalled(); expect(mocks.setDoc).not.toHaveBeenCalled();
  unmount();
  const again = renderHook(() => useRecords('local', vi.fn()));
  expect(again.result.current.records.g1.title).toBe('Read');
});
