import { describe, expect, it, vi } from 'vitest';
import { importNativeCompletions } from '../native-actions';
import { NEWS_READER_UID } from '../news-model';

const action = { id: 'action-1', uid: 'local', goalId: 'g1', date: '2026-10-30', timestamp: 100 };
const goal = { id: 'g1', type: 'goal', goalType: 'checklist' };
describe('Android notification completion import', () => {
  it('saves the original notification date and acknowledges after saving', () => {
    const save = vi.fn();
    expect(importNativeCompletions([action], 'local', () => ({ g1: goal }), save)).toEqual(['action-1']);
    expect(save).toHaveBeenCalledWith({ id: 'progress_g1_2026-10-30', type: 'progress', goalId: 'g1', date: '2026-10-30', value: true });
  });
  it('leaves the outbox unacknowledged when durable storage fails', () => {
    expect(() => importNativeCompletions([action], 'local', () => ({ g1: goal }), () => { throw new Error('Full'); })).toThrow('Full');
  });
  it('does not overwrite a later undo or edit', () => {
    const save = vi.fn();
    const records = { g1: goal, ['progress_g1_2026-10-30']: { updatedAt: 200, value: false } };
    expect(importNativeCompletions([action], 'local', () => records, save)).toEqual(['action-1']);
    expect(save).not.toHaveBeenCalled();
  });
  it('waits for a missing cloud goal instead of discarding the action', () => {
    expect(importNativeCompletions([action], 'local', () => ({}), vi.fn())).toEqual([]);
  });
  it('rejects tracker and deleted goals', () => {
    const save = vi.fn();
    expect(importNativeCompletions([action], 'local', () => ({ g1: { ...goal, goalType: 'tracker' } }), save)).toEqual(['action-1']);
    expect(importNativeCompletions([action], 'local', () => ({ g1: { ...goal, deleted: true } }), save)).toEqual(['action-1']);
    expect(save).not.toHaveBeenCalled();
  });
  it('keeps cloud actions out of the guest diary and merges guest actions into the authorized account', () => {
    const save = vi.fn();
    expect(importNativeCompletions([{ ...action, uid: NEWS_READER_UID }], 'local', () => ({ g1: goal }), save)).toEqual([]);
    expect(save).not.toHaveBeenCalled();
    expect(importNativeCompletions([action], NEWS_READER_UID, () => ({ g1: goal }), save)).toEqual(['action-1']);
  });
});

it('imports the latest queued tracker total, including zero, without incrementing it',()=>{
 let records={t:{id:'t',type:'goal',goalType:'tracker'}};const save=vi.fn(r=>{records={...records,[r.id]:{...r,updatedAt:Date.now()}}});
 const actions=[{id:'old',uid:'local',goalId:'t',date:'2026-11-01',timestamp:100,value:12.5},{id:'new',uid:'local',goalId:'t',date:'2026-11-01',timestamp:200,value:0}];
 expect(new Set(importNativeCompletions(actions,'local',()=>records,save))).toEqual(new Set(['old','new']));expect(save).toHaveBeenCalledTimes(1);expect(save).toHaveBeenCalledWith(expect.objectContaining({value:0}));
});
it('rejects invalid totals and does not turn an old tracker reply into checkbox completion',()=>{
 const save=vi.fn();for(const value of [-1,Infinity,1e10])importNativeCompletions([{id:'a',uid:'local',goalId:'t',date:'2026-11-01',timestamp:1,value}],'local',()=>({t:{id:'t',type:'goal',goalType:'tracker'}}),save);
 importNativeCompletions([{id:'a',uid:'local',goalId:'t',date:'2026-11-01',timestamp:1,value:3}],'local',()=>({t:{id:'t',type:'goal',goalType:'checklist'}}),save);expect(save).not.toHaveBeenCalled();
});
