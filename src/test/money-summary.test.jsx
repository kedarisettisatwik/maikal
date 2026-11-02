import {expect,it} from 'vitest';
import {render,screen,fireEvent,within} from '@testing-library/react';
import MoneySection from '../components/MoneySection';
import useMoneyFilter from '../useMoneyFilter';
function Summary(){const [v,set]=useMoneyFilter('test-user','web',{month:'2026-11'});return <MoneySection month={v.month} setMonth={month=>set({month})} records={{c:{id:'c',name:'Salary',kind:'income'}}} transactions={[{id:'t',date:'2026-11-02',kind:'income',categoryId:'c',amount:123456}]} onEdit={()=>{}} remove={()=>{}}/>;}
it('centers integer summary figures and restores the selected month',()=>{localStorage.clear();let view=render(<Summary/>);const summary=document.querySelector('.money-summary');expect(summary.textContent).toContain('1,235');expect(summary.textContent).not.toContain('.56');fireEvent.change(screen.getByLabelText('Summary month'),{target:{value:'2026-09'}});view.unmount();view=render(<Summary/>);expect(screen.getByLabelText('Summary month').value).toBe('2026-09');});
