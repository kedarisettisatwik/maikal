import { openTrack,consumeNativeLaunch, acknowledgeNativeLaunch } from '../native-notifications';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within,waitFor } from '@testing-library/react';
const mock = vi.hoisted(() => ({ records: {}, save: vi.fn(), remove: vi.fn(), native: { setTheme:vi.fn().mockResolvedValue({}), listAlarms: vi.fn().mockResolvedValue({ alarms: [] }) } }));
vi.mock('../firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn().mockResolvedValue() }));
vi.mock('@capacitor/core', () => ({ Capacitor:{isNativePlatform:()=>true},registerPlugin: () => mock.native }));
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
    e: { id:'e',type:'event',kind:'event',title:'Team meeting',allDay:true,schedule:{type:'everyday'},updatedAt:1 },
    c: { id:'c',type:'category',name:'Food',kind:'expense',iconMode:'emoji',icon:'🍱',updatedAt:1 }
  };
});
afterEach(() => vi.clearAllMocks());
it('uses five icon-only bottom tabs and combined plans, with screen time below them', () => {
  render(<Dashboard user={{uid:'local'}} notify={notify} restoring={false} />);
  expect(within(screen.getByRole('tablist', {name:'Main navigation'})).getAllByRole('tab')).toHaveLength(5);
  expect(screen.getByRole('tab',{name:'Money'}).textContent).toBe('');
  expect(screen.getByRole('heading',{name:'Events'})).toBeTruthy();
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

it('routes a retired report notification to scores in More', async () => {
 vi.mocked(consumeNativeLaunch).mockResolvedValueOnce({type:'quick',action:'report',requestId:'report-test'});
 render(<Dashboard user={{uid:'local'}} notify={notify} restoring={false}/>);
 expect(await screen.findByRole('heading',{name:'Completion'})).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Skip'})).toBeNull();
 expect(acknowledgeNativeLaunch).toHaveBeenCalledWith('report-test');
});

it('shows score totals without a photo editor or report button',()=>{render(<Dashboard user={{uid:'local'}} notify={notify} restoring={false}/>);fireEvent.click(screen.getByRole('tab',{name:'More'}));expect(screen.getByRole('heading',{name:'Completion'})).toBeTruthy();expect(screen.queryByRole('button',{name:/Yesterday.*report/})).toBeNull();expect(document.querySelector('[data-score-editor]')).toBeNull();expect(screen.queryByText(/report reminders/)).toBeNull();});

it('includes trackers with targets in the home progress bar',()=>{const d=new Date(),date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;mock.records.t={id:'t',type:'goal',title:'Pushups',goalType:'tracker',target:40,schedule:{type:'everyday'}};mock.records.free={id:'free',type:'goal',title:'Steps',goalType:'tracker',schedule:{type:'everyday'}};mock.records['progress_g_'+date]={type:'progress',value:true};mock.records['progress_t_'+date]={type:'progress',value:40};render(<Dashboard user={{uid:'local'}} notify={notify} restoring={false}/>);const bar=within(screen.getByRole('tabpanel',{name:'home'})).getByRole('progressbar');expect(bar.getAttribute('aria-valuemax')).toBe('2');expect(bar.getAttribute('aria-valuenow')).toBe('2');expect(bar.firstChild.style.width).toBe('100%');});

it('routes managed screen-time entry launches to Track instead of its goal editor',async()=>{mock.records.g={...mock.records.g,managedBy:'screenTime',goalType:'tracker',trackerUnit:'time',target:120};vi.mocked(consumeNativeLaunch).mockResolvedValueOnce({type:'entry',recordId:'g',uid:'local',requestId:'managed-launch'});render(<Dashboard user={{uid:'local'}} notify={notify} restoring={false}/>);await waitFor(()=>expect(openTrack).toHaveBeenCalled());expect(screen.queryByRole('button',{name:'Update goal'})).toBeNull();expect(acknowledgeNativeLaunch).toHaveBeenCalledWith('managed-launch');});

it('confirms Start over and saves only the scoring baseline, preserving all diary records',()=>{
 const confirm=vi.spyOn(window,'confirm').mockReturnValue(false);mock.save.mockClear();
 render(<Dashboard user={{uid:'local'}} notify={notify} restoring={false}/>);
 fireEvent.click(screen.getByRole('tab',{name:'More'}));
 mock.save.mockClear();fireEvent.click(screen.getByRole('button',{name:/^Start over/}));expect(mock.save).not.toHaveBeenCalled();
 confirm.mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:/^Start over/}));
 expect(confirm).toHaveBeenCalledWith(expect.stringContaining("Today's completed goals"));
 expect(mock.save).toHaveBeenCalledTimes(1);expect(mock.save).toHaveBeenCalledWith(expect.objectContaining({id:'score_settings',type:'scoreSettings',startDate:expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)}));
 expect(mock.records.g.deleted).toBeUndefined();confirm.mockRestore();
});

it('keeps Home tasks compact and opens time, target and actions in a separate task view',()=>{
 mock.records.t={id:'t',type:'task',title:'Build app',description:'Keep this in detail view',startDate:'2026-01-01',deadline:'2026-12-01',trackTime:true,target:60,targetRule:'atLeast',focusEnabled:true,timeAdjustment:15};
 render(<Dashboard user={{uid:'local'}} notify={notify} restoring={false}/>);
 const home=screen.getByRole('tabpanel',{name:'home'}),row=within(home).getByRole('button',{name:'Build app'}).closest('article');
 expect(within(row).getByText(/Deadline · 2026-12-01 · 15 min/)).toBeTruthy();expect(within(row).queryByRole('button',{name:'Edit task'})).toBeNull();expect(within(row).queryByRole('spinbutton')).toBeNull();expect(within(row).queryByText('Keep this in detail view')).toBeNull();
 mock.save.mockClear();fireEvent.click(within(row).getByRole('checkbox',{name:'Complete task Build app'}));expect(mock.save).toHaveBeenCalledWith(expect.objectContaining({id:'t',completed:true}));
 fireEvent.click(within(row).getByRole('button',{name:'Build app'}));const detail=screen.getByRole('dialog');
 expect(within(detail).getByRole('heading',{name:'Build app'})).toBeTruthy();expect(within(detail).getByText('Keep this in detail view')).toBeTruthy();expect(within(detail).getByRole('spinbutton',{name:'Total minutes for Build app'}).value).toBe('15');expect(within(detail).getByText('Target · At least 60 min')).toBeTruthy();expect(within(detail).getByRole('button',{name:'Focus'})).toBeTruthy();
 fireEvent.click(within(detail).getByRole('button',{name:'Delete task'}));expect(mock.remove).toHaveBeenCalledWith('t');
 fireEvent.click(within(detail).getByRole('button',{name:'Edit task'}));expect(screen.getByDisplayValue('Build app')).toBeTruthy();expect(screen.getByRole('button',{name:'Save task'})).toBeTruthy();
});

it('shows goal minutes with exactly two decimals without rounding stored progress on focus/blur',()=>{
 const goal={id:'time',type:'goal',title:'Study',goalType:'tracker',trackerUnit:'time',target:40};
 const progress={progress_time_2026:{},'progress_time_2026-11-03':{value:12.345678}};const save=vi.fn();
 const {rerender}=render(<GoalRow goal={goal} records={progress} date="2026-11-03" onProgress={save} notify={notify}/>);
 let input=screen.getByRole('spinbutton',{name:'Study mins'});expect(input.value).toBe('12.35');expect(screen.getByText(/At least 40.00/)).toBeTruthy();
 fireEvent.focus(input);fireEvent.blur(input);expect(save).not.toHaveBeenCalled();expect(progress['progress_time_2026-11-03'].value).toBe(12.345678);
 fireEvent.focus(input);fireEvent.change(input,{target:{value:'15.6789'}});fireEvent.blur(input);expect(save).toHaveBeenCalledWith('time',15.6789,'2026-11-03');expect(input.value).toBe('15.68');
 rerender(<GoalRow goal={{...goal,trackerUnit:'count'}} records={progress} date="2026-11-03" onProgress={save} notify={notify}/>);expect(screen.getByRole('spinbutton').value).toBe('12.345678');
});
