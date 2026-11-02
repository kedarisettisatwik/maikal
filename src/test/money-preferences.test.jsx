import {expect,it,vi,beforeEach} from 'vitest';
import {render,screen,fireEvent,within} from '@testing-library/react';
import MoneyPage from '../mobile/MoneyPage';
import useMoneyFilter from '../useMoneyFilter';
beforeEach(()=>localStorage.clear());
const props={uid:'local',date:'2026-11-02',records:{},transactions:[{id:'t',date:'2026-11-02',kind:'income',amount:123456}],onAdd:vi.fn(),onEdit:vi.fn(),remove:vi.fn()};
it('restores period and date on reopening while separating account preferences',()=>{
 let view=render(<MoneyPage {...props}/>);fireEvent.change(screen.getByLabelText('Money period'),{target:{value:'month'}});fireEvent.change(screen.getByLabelText('Money date'),{target:{value:'2026-10'}});view.unmount();view=render(<MoneyPage {...props}/>);expect(screen.getByLabelText('Money period').value).toBe('month');expect(screen.getByLabelText('Money date').value).toBe('2026-10');view.rerender(<MoneyPage {...props} uid="other"/>);expect(screen.getByLabelText('Money period').value).toBe('day');view.rerender(<MoneyPage {...props}/>);expect(screen.getByLabelText('Money date').value).toBe('2026-10');
});
it('rounds only summary display and retains transaction precision',()=>{render(<MoneyPage {...props}/>);const summary=screen.getByLabelText('Money totals');expect(summary.className).toContain('money-summary');expect(summary.textContent).toContain('1,235');expect(summary.textContent).not.toContain('.');expect(screen.getByLabelText(/Transaction Uncategorized/).textContent).toContain('1,234.56');});
function WebFilter({uid}){const [v,set]=useMoneyFilter(uid,'web',{month:'2026-11'});return <input aria-label="Summary month" value={v.month} onChange={e=>set({month:e.target.value})}/>;}
it('restores the website month and rejects malformed saved dates',()=>{let view=render(<WebFilter uid="local"/>);fireEvent.change(screen.getByLabelText('Summary month'),{target:{value:'2026-08'}});view.unmount();view=render(<WebFilter uid="local"/>);expect(screen.getByLabelText('Summary month').value).toBe('2026-08');view.unmount();localStorage.setItem('mantra-money-filter-web-local','{"month":"broken"}');render(<WebFilter uid="local"/>);expect(screen.getByLabelText('Summary month').value).toBe('2026-11');});
