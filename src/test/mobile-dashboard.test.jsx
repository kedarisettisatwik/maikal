import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
const mock = vi.hoisted(() => ({ records: {}, save: vi.fn(), remove: vi.fn(), native: { listAlarms: vi.fn().mockResolvedValue({ alarms: [] }) } }));
vi.mock('../firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn().mockResolvedValue() }));
vi.mock('@capacitor/core', () => ({ registerPlugin: () => mock.native }));
vi.mock('../useRecords', () => ({ default: () => ({ records: mock.records, save: mock.save, remove: mock.remove, status:'Saved locally', error:'' }) }));
vi.mock('../useScreenTime', () => ({ default: () => ({ loading: false, allowed: false }) }));
vi.mock('../native-notifications', () => ({ isNative: () => true, pendingNativeShare: vi.fn().mockResolvedValue({}), consumeNativeLaunch: vi.fn().mockResolvedValue({}), acknowledgeNativeLaunch: vi.fn(), acknowledgeNativeShare: vi.fn(), openTrack: vi.fn().mockResolvedValue(), openAlarms: vi.fn().mockResolvedValue(), prepareAlarmAccess: vi.fn().mockResolvedValue(), enableNotifications: vi.fn().mockResolvedValue(), syncNotifications: vi.fn().mockResolvedValue(), openNoteLink: vi.fn() }));
vi.mock('../components/LeetcodeSection', () => ({ default: () => <h2>Private LeetCode</h2> }));
vi.mock('../components/NewsSection', () => ({ default: () => <h2>Private News</h2> }));
vi.mock('../components/JobsSection', () => ({ default: () => <h2>Private Jobs</h2> }));
import Dashboard, { GoalRow } from '../mobile/Dashboard';
import { clearCelebration } from '../mobile/goal-celebration';
import { expenseBreakdown, filterTransactions } from '../mobile/MoneyPage';
const notify = vi.fn();
beforeEach(() => {
  Element.prototype.scrollTo = vi.fn();
  window.history.replaceState(null, '', '/');
  mock.records = {
    g: { id:'g',type:'goal',title:'Read',goalType:'checklist',iconMode:'emoji',icon:'📚',schedule:{type:'everyday'},notificationTimes:['09:00'],alarmTimes:['08:00'],updatedAt:1 },
    e: { id:'e',type:'event',kind:'meeting',title:'Team meeting',allDay:true,schedule:{type:'everyday'},updatedAt:1 },
    c: { id:'c',type:'category',name:'Food',kind:'expense',iconMode:'emoji',icon:'🍱',updatedAt:1 }
  };
});
afterEach(() => vi.clearAllMocks());
it('uses five icon-only bottom tabs and combined plans, with screen time below them', () => {
  render(<Dashboard user={{uid:'local'}} notify={notify} restoring={false} />);
  expect(within(screen.getByRole('tablist', {name:'Main navigation'})).getAllByRole('tab')).toHaveLength(5);
  expect(screen.getByRole('tab',{name:'Money'}).textContent).toBe('');
  expect(screen.getByRole('heading',{name:'Reminders & Meetings'})).toBeTruthy();
  const home = screen.getByRole('tabpanel',{name:'home'});
  expect(within(home).getByRole('heading',{name:'Today’s screen time'})).toBeTruthy();
  expect(within(home).queryByText('09:00')).toBeNull();
  expect(within(home).queryByText('08:00')).toBeNull();
  expect(screen.queryByText('Private News')).toBeNull();
});
it('opens all goals with edit and delete actions, and edits without replacing identity', () => {
  render(<Dashboard user={{uid:'local'}} notify={notify} restoring={false} />);
  fireEvent.click(screen.getAllByRole('button',{name:'View all ↗'})[0]);
  expect(screen.getByRole('button',{name:'Edit goal Read'})).toBeTruthy();
  expect(screen.getByRole('button',{name:'Delete goal Read'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Edit goal Read'}));
  expect(screen.getByDisplayValue('Read')).toBeTruthy();
  expect(screen.getByText('Alarm times')).toBeTruthy();
  expect(screen.getByText('Notification times')).toBeTruthy();
});
it('places the authorized private edition after screen time', () => {
  render(<Dashboard user={{uid:'0kX2kfDq3KV9MIhtDV7IDpuXnfJ3'}} notify={notify} restoring={false} />);
  const home = screen.getByRole('tabpanel',{name:'home'});
  expect(within(home).getByText('Private LeetCode')).toBeTruthy();
  const heading = within(home).getByText('Today’s screen time'), news = within(home).getByText('Private News');
  expect(heading.compareDocumentPosition(news) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
it('shows stored category icons in transactions and separates totals by month', () => {
  const now = new Date(), date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  mock.records.t = {id:'t',type:'transaction',date,kind:'expense',amount:12345,categoryId:'c',updatedAt:1};
  render(<Dashboard user={{uid:'local'}} notify={notify} restoring={false} />);
  fireEvent.click(screen.getByRole('tab',{name:'Money'}));
  expect(screen.getByRole('tabpanel',{name:'money'}).textContent).toContain('🍱');
  expect(expenseBreakdown([{id:'1',date:'2026-10-31',kind:'expense',amount:350,categoryId:'c'},{id:'2',date:'2026-09-30',kind:'expense',amount:999,categoryId:'c'}],'2026-10')[0].amount).toBe(350);
});

it('filters money records consistently for all time, month and day', () => {
  const rows = [{id:'a', date:'2026-10-31'}, {id:'b', date:'2026-10-01'}, {id:'c', date:'2026-09-30'}, {id:'d', date:'2026-10-31',deleted:true}];
  expect(filterTransactions(rows,'day','2026-10-31').map(t=>t.id)).toEqual(['a']);
  expect(filterTransactions(rows,'month','2026-10').map(t=>t.id)).toEqual(['a','b']);
  expect(filterTransactions(rows,'all','').map(t=>t.id)).toEqual(['a','b','c']);
});
it('opens a saved-link editor with a separate source hint', () => {
  render(<Dashboard user={{uid:'local'}} notify={notify} restoring={false} />);
  fireEvent.click(screen.getByRole('tab',{name:'Note'}));
  fireEvent.click(screen.getByRole('button',{name:'New note'}));
  fireEvent.click(screen.getByRole('button',{name:'Saved link'}));
  expect(screen.getByText('Paste a link to identify its source')).toBeTruthy();
  expect(screen.getByLabelText('Description')).toBeTruthy();
  expect(screen.getByRole('button',{name:'Save note'})).toBeTruthy();
});

it('opens APK reports immediately without an expand or collapse step', () => {
  render(<Dashboard user={{uid:'local'}} notify={notify} restoring={false} />);
  fireEvent.click(screen.getByRole('tab',{name:'More'}));
  fireEvent.click(screen.getByRole('button',{name:/Goal reports/}));
  expect(screen.getByText('Report month')).toBeTruthy();
  expect(screen.getByRole('group',{name:'Read completion calendar'})).toBeTruthy();
  expect(screen.queryByText(/Expand|Collapse/)).toBeNull();
});

it('celebrates a completed checkbox only after its progress saves', () => {
  const original = Element.prototype.animate;
  Element.prototype.animate = vi.fn(() => ({cancel:vi.fn()}));
  const onProgress = vi.fn(() => true);
  const view = render(<GoalRow goal={mock.records.g} records={{}} date="2026-10-31" onProgress={onProgress} notify={notify} />);
  try {
    expect(document.querySelector('.goal-celebration')).toBeNull();
    fireEvent.click(screen.getByRole('checkbox',{name:'Mark Read done'}));
    expect(onProgress).toHaveBeenCalledWith('g',true,'2026-10-31');
    expect(document.querySelectorAll('.goal-celebration i')).toHaveLength(24);
    clearCelebration();
    onProgress.mockReturnValue(false);
    fireEvent.click(screen.getByRole('checkbox',{name:'Mark Read done'}));
    expect(document.querySelector('.goal-celebration')).toBeNull();
  } finally { clearCelebration(); Element.prototype.animate = original; view.unmount(); }
});
