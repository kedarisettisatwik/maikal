import { afterEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const platform=vi.hoisted(()=>({native:true}));
vi.mock('../native-notifications',()=>({isNative:()=>platform.native}));
import EntryDialog from '../components/EntryDialog';
afterEach(()=>{platform.native=true;});
function form(type,save=vi.fn(),record){const close=vi.fn();render(<EntryDialog entry={{type,record}} categories={[]} save={save} removeCategory={vi.fn()} notify={vi.fn()} onClose={close}/>);return {save,close};}
it.each(['goal','reminder','meeting'])('lets an APK %s use an alarm without notification times',async type=>{
  const user=userEvent.setup(),{save}=form(type);await user.type(screen.getByLabelText('Title'),'Linked '+type);await user.click(screen.getByRole('button',{name:'+ Add alarm time'}));await user.click(screen.getByRole('button',{name:'Create '+type}));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({alarmTimes:['09:00'],notificationTimes:[],title:'Linked '+type}));
});
it('supports a notification and an alarm at the same time and removes them independently',async()=>{
  const user=userEvent.setup(),{save}=form('goal');await user.type(screen.getByLabelText('Title'),'Both alerts');await user.click(screen.getByRole('button',{name:'+ Add time'}));await user.click(screen.getByRole('button',{name:'+ Add alarm time'}));await user.click(screen.getByRole('button',{name:'Remove notification 09:00'}));await user.click(screen.getByRole('button',{name:'Create goal'}));expect(save).toHaveBeenCalledWith(expect.objectContaining({alarmTimes:['09:00'],notificationTimes:[]}));
});
it('saves both alert types with the selected repeat schedule',async()=>{
  const user=userEvent.setup(),{save}=form('goal');await user.type(screen.getByLabelText('Title'),'Friday');await user.click(screen.getByRole('button',{name:'Particular days'}));await user.click(screen.getByLabelText('Fri'));await user.click(screen.getByRole('button',{name:'+ Add time'}));fireEvent.change(screen.getByLabelText('Add alarm time'),{target:{value:'10:30'}});await user.click(screen.getByRole('button',{name:'+ Add alarm time'}));await user.click(screen.getByRole('button',{name:'Create goal'}));expect(save).toHaveBeenCalledWith(expect.objectContaining({notificationTimes:['09:00'],alarmTimes:['10:30'],schedule:expect.objectContaining({type:'days',days:[5]})}));
});
it('preserves web-edited alarm metadata without offering Android alarm controls on the website',async()=>{
  platform.native=false;const user=userEvent.setup(),{save}=form('goal',vi.fn(),{id:'g',title:'Original',schedule:{type:'everyday'},alarmTimes:['08:00']});expect(screen.queryByLabelText('Add alarm time')).toBeNull();await user.click(screen.getByRole('button',{name:'Update goal'}));expect(save).toHaveBeenCalledWith(expect.objectContaining({id:'g',alarmTimes:['08:00']}));
});
it('keeps the form open and preserves the draft when Android needs alarm permission',async()=>{
  const save=vi.fn().mockRejectedValue(new Error('Enable Alarms & reminders, then return and save again.'));const user=userEvent.setup(),{close}=form('goal',save);await user.type(screen.getByLabelText('Title'),'Keep my draft');await user.click(screen.getByRole('button',{name:'+ Add alarm time'}));await user.click(screen.getByRole('button',{name:'Create goal'}));await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Enable Alarms & reminders'));expect(close).not.toHaveBeenCalled();expect(screen.getByLabelText('Title').value).toBe('Keep my draft');expect(screen.getByRole('button',{name:'Remove alarm 09:00'})).toBeTruthy();
});
