import {expect,it} from 'vitest';
import {render,screen} from '@testing-library/react';
import ReportsSection from '../mobile/ReportsSection';
import {goalValueText} from '../goal-value-format';
it('formats zero, whole and fractional goal minutes with two decimals while leaving counts unchanged',()=>{const g={trackerUnit:'time'};expect(goalValueText(g,0)).toBe('0.00');expect(goalValueText(g,5)).toBe('5.00');expect(goalValueText(g,5.123456)).toBe('5.12');expect(goalValueText(g,5.999)).toBe('6.00');expect(goalValueText({trackerUnit:'count'},5)).toBe('5');});
it('formats APK report totals and day labels without changing chart values',()=>{render(<ReportsSection goals={[{id:'g',title:'Study',goalType:'tracker',trackerUnit:'time',schedule:{type:'everyday'}}]} records={{'progress_g_2026-11-01':{value:12.345678}}} date="2026-11-03"/>);expect(screen.getByText('12.35 mins total · 1 days logged')).toBeTruthy();expect(screen.getByLabelText('2026-11-01: 12.35 mins').style.height).toBe('100%');});
