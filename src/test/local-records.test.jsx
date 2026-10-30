import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ snapshot: vi.fn(), setDoc: vi.fn() }));
vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({ collection: vi.fn(), doc: vi.fn(), onSnapshot: mocks.snapshot, query: vi.fn(), setDoc: mocks.setDoc, where: vi.fn() }));
import useRecords from '../useRecords';
import {where} from 'firebase/firestore';
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
it('includes notes in the Firebase listener and merges received APK notes', () => {
  mocks.snapshot.mockReturnValue(()=>{});
  const {result}=renderHook(()=>useRecords('0kX2kfDq3KV9MIhtDV7IDpuXnfJ3',vi.fn()));
  expect(where).toHaveBeenCalledWith('type','in',expect.arrayContaining(['note']));
  const subscription=mocks.snapshot.mock.calls[0];
  act(()=>subscription[2]({docs:[{metadata:{hasPendingWrites:false},data:()=>({id:'apk-note',type:'note',noteType:'text',title:'From APK',body:'Synced',updatedAt:10})}],metadata:{fromCache:false}}));
  expect(result.current.records['apk-note'].title).toBe('From APK');
});
it('receives APK screen-time totals from Firebase and uploads pending totals after reconnecting', async () => {
  mocks.snapshot.mockReturnValue(()=>{});mocks.setDoc.mockResolvedValue();
  const uid='0kX2kfDq3KV9MIhtDV7IDpuXnfJ3';
  const view=renderHook(()=>useRecords(uid,vi.fn()));
  expect(where).toHaveBeenCalledWith('type','in',expect.arrayContaining(['screentime']));
  const record={id:'screentime_phone_2026-10-30',type:'screentime',date:'2026-10-30',deviceId:'phone',totalMs:60000,observedAt:100,updatedAt:100};
  act(()=>view.result.current.save(record));expect(mocks.setDoc).not.toHaveBeenCalled();
  await act(async()=>mocks.snapshot.mock.calls[0][2]({docs:[],metadata:{fromCache:false}}));
  expect(mocks.setDoc).toHaveBeenCalledWith(undefined,expect.objectContaining({type:'screentime',totalMs:60000}));
  await act(async()=>mocks.snapshot.mock.calls[0][2]({docs:[{metadata:{hasPendingWrites:false},data:()=>({...record,totalMs:120000,updatedAt:Date.now()+1000})}],metadata:{fromCache:false}}));
  expect(view.result.current.records[record.id].totalMs).toBe(120000);
});
