import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EntryDialog, { Schedule } from '../components/EntryDialog';
import GoalBoard from '../components/GoalBoard';
import MoneySection from '../components/MoneySection';

const goal = { id: 'g', title: 'Steps', goalType: 'tracker', trackerUnit: 'count', schedule: { type: 'everyday' } };
describe('React entry interactions', () => {
  it('saves a custom category emoji instead of an image path', async () => {
    const user=userEvent.setup(),save=vi.fn();
    render(<EntryDialog entry={{type:'category'}} categories={[]} save={save} removeCategory={vi.fn()} notify={vi.fn()} onClose={vi.fn()}/>);
    await user.type(screen.getByLabelText('Name'),'Coffee');fireEvent.change(screen.getByLabelText('Your category emoji'),{target:{value:'☕'}});
    await user.click(screen.getByRole('button',{name:'Add category'}));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({name:'Coffee',iconMode:'emoji',icon:'☕'}));
  });
  it('lets a provided icon replace a custom category emoji', async () => {
    const user=userEvent.setup(),save=vi.fn();
    render(<EntryDialog entry={{type:'category'}} categories={[]} save={save} removeCategory={vi.fn()} notify={vi.fn()} onClose={vi.fn()}/>);
    await user.type(screen.getByLabelText('Name'),'Food');fireEvent.change(screen.getByLabelText('Your category emoji'),{target:{value:'🍔'}});await user.click(screen.getByRole('button',{name:'fruits'}));await user.click(screen.getByRole('button',{name:'Add category'}));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({iconMode:'select',icon:'expenses/fruits.png'}));
  });
  it('retains weekday selections when clicking labels and checkboxes', async () => {
    const user = userEvent.setup();
    function Form() { const [schedule, setSchedule] = useState({ type: 'everyday', days: [], dates: [''] }); return <Schedule value={schedule} onChange={setSchedule} />; }
    render(<Form />); await user.click(screen.getByRole('button', { name: 'Particular days' }));
    await user.click(screen.getByLabelText('Mon')); await user.click(screen.getByLabelText('Wed'));
    expect(screen.getByLabelText('Mon').checked).toBe(true); expect(screen.getByLabelText('Wed').checked).toBe(true);
    await user.click(screen.getByLabelText('Mon')); expect(screen.getByLabelText('Mon').checked).toBe(false); expect(screen.getByLabelText('Wed').checked).toBe(true);
  });
  it('saves trackers on blur without a Save button', async () => {
    const save = vi.fn(), user = userEvent.setup();
    render(<GoalBoard goals={[goal]} todayGoals={[goal]} records={{}} date="2026-10-29" onProgress={save} remove={vi.fn()} notify={vi.fn()} />);
    const input = screen.getByRole('spinbutton'); await user.clear(input); await user.type(input, '4500'); expect(save).not.toHaveBeenCalled(); await user.tab();
    expect(save).toHaveBeenCalledWith('g', 4500, '2026-10-29'); expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });
  it('prefills and updates a transaction without creating a second ID', async () => {
    const save = vi.fn(), user = userEvent.setup(), cat = { id: 'food', name: 'Food', kind: 'expense' };
    render(<EntryDialog entry={{ type: 'transaction', transaction: { id: 'tx', amount: 1000, kind: 'expense', categoryId: 'food', date: '2026-10-28', note: 'Lunch' } }} categories={[cat]} save={save} removeCategory={vi.fn()} notify={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByDisplayValue('Lunch')).toBeTruthy(); const amount = screen.getByRole('spinbutton'); await user.clear(amount); await user.type(amount, '25.50'); await user.click(screen.getByRole('button', { name: 'Update transaction' }));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: 'tx', amount: 2550, categoryId: 'food' }));
  });
  it('renders historical transaction actions and an expense-only donut', () => {
    const remove = vi.fn(), edit = vi.fn(), tx = [{ id: 'old', amount: 7500, kind: 'expense', categoryId: 'food', date: '2026-09-02', note: 'Dinner' }, { id: 'pay', amount: 100000, kind: 'income', categoryId: 'salary', date: '2026-09-01' }];
    render(<MoneySection month="2026-09" setMonth={vi.fn()} transactions={tx} records={{ food: { name: 'Food' } }} onEdit={edit} remove={remove} />);
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Food ₹75.00, 100.0%');
    expect(screen.getByRole('img').getAttribute('aria-label')).not.toContain('1,000');
    fireEvent.click(screen.getByRole('button', { name: 'Delete transaction Dinner' })); expect(remove).toHaveBeenCalledWith('old');
    fireEvent.click(screen.getByRole('button', { name: 'Edit transaction Dinner' })); expect(edit).toHaveBeenCalledWith(tx[0]);
  });
});
