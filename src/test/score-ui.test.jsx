import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('../native-notifications', () => ({ isNative: () => false }));
import EntryDialog from '../components/EntryDialog';
import ScoreCard from '../components/ScoreCard';
afterEach(() => vi.restoreAllMocks());
it('keeps a legacy meeting’s identity and alert times when saving as an event', async () => {
  const save=vi.fn(); const record={ id:'legacy',title:'Planning',type:'event',kind:'meeting',allDay:false,startTime:'10:00',endTime:'11:00',schedule:{type:'everyday'},notificationTimes:['09:50'],alarmTimes:['10:00'] };
  render(<EntryDialog entry={{type:'meeting',record}} categories={[]} save={save} removeCategory={vi.fn()} onClose={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Update event'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({id:'legacy',type:'event',kind:'meeting',notificationTimes:['09:50'],alarmTimes:['10:00'],startTime:'10:00',endTime:'11:00'})));
});
it('saves an inclusive zero tracker target rather than treating it as missing', async () => {
  const save=vi.fn();render(<EntryDialog entry={{type:'goal'}} categories={[]} save={save} removeCategory={vi.fn()} onClose={vi.fn()}/>);
  fireEvent.change(screen.getByLabelText('Title'),{target:{value:'Limit'}});fireEvent.change(screen.getByLabelText('Goal type'),{target:{value:'tracker'}});fireEvent.click(screen.getByLabelText('Set a scoring target'));fireEvent.change(screen.getByLabelText('Target condition'),{target:{value:'atMost'}});fireEvent.change(screen.getByLabelText('Target value'),{target:{value:'0'}});fireEvent.click(screen.getByRole('button',{name:'Create goal'}));
  await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({goalType:'tracker',target:0,targetRule:'atMost'})));
});
it('offers Choose photo and Skip and creates a phone-sized canvas from the previous day', async () => {
  const ctx={fillRect:vi.fn(),fillText:vi.fn(),measureText:()=>({width:100}),save:vi.fn(),restore:vi.fn(),beginPath:vi.fn(),arc:vi.fn(),rect:vi.fn(),clip:vi.fn(),stroke:vi.fn()};
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx);vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,report');
  const yesterday={date:'2026-10-31',points:12,completed:1,total:1,bonus:true,goals:[{id:'g',title:'Pushups',goalType:'tracker',target:40,targetRule:'atLeast'}]};
  render(<ScoreCard user={{uid:'local',displayName:'Satwik'}} records={{'progress_g_2026-10-31':{value:40}}} date="2026-11-01" score={{today:{points:99},overall:999,yesterday,throughYesterday:120}} onBack={vi.fn()} notify={vi.fn()}/>);
  expect(screen.getByRole('button',{name:'Choose photo'})).toBeTruthy();expect(screen.queryByRole('img')).toBeNull();expect(screen.getByText(/Met/)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Skip'}));
  await waitFor(()=>expect(ctx.fillText.mock.calls.some(c=>c[0]==='done with mantra')).toBe(true));expect(screen.getByRole('img').width).toBe(1080);expect(screen.getByRole('img').height).toBe(1920);fireEvent.click(screen.getByLabelText('Overall score'));expect(screen.getByRole('button',{name:'Download score card'})).toBeTruthy();
  expect(ctx.fillText.mock.calls.some(c=>c[0]==='12')).toBe(true);expect(ctx.fillText.mock.calls.some(c=>c[0]==='120')).toBe(true);expect(ctx.fillText.mock.calls.some(c=>c[0]==='99')).toBe(false);
});
