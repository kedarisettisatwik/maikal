import { it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { screenTimeRecords, screenTimeChanged, latestScreenTime } from '../screen-time';
import { mergeRecords } from '../model';
import { NEWS_READER_UID } from '../news-model';
vi.mock('../native-notifications', () => ({ isNative: () => false, openTrack: vi.fn() }));
import ScreenTimeSummary from '../components/ScreenTimeSummary';
const snapshot={allowed:true,deviceId:'phone-a',deviceName:'Pixel',timezone:'Asia/Kolkata',days:[{date:'2026-10-30',totalMs:13320000,observedAt:1793331000000}]};
it('uploads only daily totals, not app usage, and rejects invalid totals',()=>{
  const result=screenTimeRecords({...snapshot,apps:[{name:'Private app'}]});
  expect(result).toHaveLength(1);expect(result[0]).not.toHaveProperty('apps');expect(result[0].id).toBe('screentime_phone-a_2026-10-30');
  expect(screenTimeRecords({...snapshot,allowed:false})).toEqual([]);expect(screenTimeRecords({...snapshot,days:[{date:'2026-10-30',totalMs:-1}]})).toEqual([]);
});
it('merges cloud screen time so websites receive Android totals',()=>{
  const record={...screenTimeRecords(snapshot)[0],updatedAt:123};const merged=mergeRecords({}, {},[record]);expect(latestScreenTime(merged.records,'2026-10-30')).toEqual(record);
});
it('keeps devices separate, shows the latest reporting phone, and never adds their totals together',()=>{
  const a=screenTimeRecords(snapshot)[0];const b={...a,id:'b',deviceId:'phone-b',totalMs:60000,observedAt:a.observedAt+1};
  expect(latestScreenTime({a,b},a.date)).toEqual(b);expect(latestScreenTime({a,b},a.date,'phone-a')).toEqual(a);expect(latestScreenTime({a,b},'2026-10-31')).toBeUndefined();
});
it('avoids writing unchanged totals each minute but refreshes the timestamp after five minutes',()=>{const r=screenTimeRecords(snapshot)[0];expect(screenTimeChanged(r,{...r,observedAt:r.observedAt+60000})).toBe(false);expect(screenTimeChanged(r,{...r,observedAt:r.observedAt+300000})).toBe(true);expect(screenTimeChanged(r,{...r,totalMs:r.totalMs+60000})).toBe(true);});
it('shows the synced total on the website with its source and freshness',()=>{const r=screenTimeRecords(snapshot)[0];render(<ScreenTimeSummary records={{[r.id]:r}} date={r.date} uid={NEWS_READER_UID} state={{}} notify={()=>{}}/>);expect(screen.getByText('3 h 42 min')).toBeTruthy();expect(screen.getByText(/Pixel · Updated/)).toBeTruthy();expect(screen.queryByRole('button',{name:'Open Track'})).toBeNull();});
it('does not present yesterday’s stale total as today’s usage',()=>{const r=screenTimeRecords(snapshot)[0];render(<ScreenTimeSummary records={{[r.id]:r}} date="2026-10-31" uid={NEWS_READER_UID} state={{}} notify={()=>{}}/>);expect(screen.queryByText('3 h 42 min')).toBeNull();expect(screen.getByText(/Open the Firebase APK/)).toBeTruthy();});
