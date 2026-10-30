import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
const fixture=vi.hoisted(()=>({records:{g:{id:'g',type:'goal',title:'Gym',goalType:'checklist',schedule:{type:'everyday'},notificationTimes:['10:30']},m:{id:'m',type:'event',kind:'meeting',title:'Planning',allDay:false,startTime:'16:10',endTime:'16:45',schedule:{type:'everyday'},notificationTimes:['15:50']},r:{id:'r',type:'event',kind:'reminder',title:'Water plants',allDay:true,schedule:{type:'everyday'},notificationTimes:['11:00']}}}));
vi.mock('../firebase',()=>({auth:{}}));
vi.mock('../useRecords',()=>({default:()=>({records:fixture.records,save:vi.fn(),remove:vi.fn(),error:'',status:'Saved on this device'})}));
import Dashboard from '../components/Dashboard';
import GoalBoard from '../components/GoalBoard';
it('hides goal alert times while keeping accessible icon edit and delete actions',()=>{
  const edit=vi.fn(),remove=vi.fn();const goal=fixture.records.g;
  const view=render(<GoalBoard goals={[goal]} todayGoals={[goal]} records={{}} date="2026-10-31" onProgress={vi.fn()} onEdit={edit} remove={remove} notify={vi.fn()}/>);
  expect(screen.queryByText('10:30')).toBeNull();view.container.querySelector('details').open=true;
  const button=screen.getByRole('button',{name:'Edit goal Gym'});expect(button.textContent).toBe('');fireEvent.click(button);expect(edit).toHaveBeenCalledWith(goal);
  fireEvent.click(screen.getByRole('button',{name:'Delete goal Gym'}));expect(remove).toHaveBeenCalledWith('g');
});
it('hides reminder and meeting notification times, retaining actual meeting hours and icon labels',()=>{
  const view=render(<Dashboard user={{uid:'local',email:'On this device'}} notify={vi.fn()} onConnect={vi.fn()} restoring={false}/>);
  for(const time of ['10:30','15:50','11:00'])expect(screen.queryByText(time,{exact:false})).toBeNull();
  expect(screen.getByText('16:10')).toBeTruthy();view.container.querySelectorAll('details').forEach(d=>d.open=true);
  expect(screen.getByRole('button',{name:'Edit meeting Planning'})).toBeTruthy();expect(screen.getByRole('button',{name:'Delete reminder Water plants'})).toBeTruthy();
});
