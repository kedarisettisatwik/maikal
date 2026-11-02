import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('../native-notifications', () => ({ isNative: () => false }));
import EntryDialog from '../components/EntryDialog';
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
