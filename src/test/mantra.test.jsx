import {afterEach,expect,it,vi} from 'vitest';
vi.hoisted(()=>{vi.stubEnv('VITE_FIREBASE_API_KEY','usage-test-key');vi.stubEnv('VITE_FIREBASE_PROJECT_ID','usage-test-project');});
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {usageCounts,reportUsage} from '../usage';
import {readTheme,applyTheme,themeKey} from '../theme';
import {ThemeChoice} from '../components/AppInfo';
afterEach(()=>{localStorage.clear();delete document.documentElement.dataset.theme;vi.unstubAllGlobals()});
it('counts configured features without collecting any private record content',()=>{
 const records={a:{type:'goal',title:'private title',notificationTimes:['09:00','10:00'],alarmTimes:['09:00']},b:{type:'event',kind:'reminder'},c:{type:'event',kind:'meeting'},d:{type:'transaction',kind:'expense',amount:12345},e:{type:'note',body:'secret'},f:{type:'goal',deleted:true}};
 expect(usageCounts(records)).toEqual({goals:1,reminders:1,meetings:1,notifications:2,alarms:1,expenses:1,notes:1});expect(JSON.stringify(usageCounts(records))).not.toMatch(/secret|private|12345/);
});
it('remembers a theme and resolves system preference',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true}));expect(readTheme()).toBe('system');applyTheme();expect(document.documentElement.dataset.theme).toBe('dark');
 render(<ThemeChoice/>);await userEvent.selectOptions(screen.getByLabelText('Theme'),'light');expect(localStorage.getItem(themeKey)).toBe('light');expect(document.documentElement.dataset.theme).toBe('light');
});
it('writes aggregate-only usage under an anonymous identity and throttles repeats',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>({localId:'test-install',idToken:'token',refreshToken:'refresh',expiresIn:3600})}).mockResolvedValueOnce({ok:true,json:async()=>({})});vi.stubGlobal('fetch',fetcher);
 await reportUsage({a:{type:'goal',title:'Never upload me'}});expect(fetcher).toHaveBeenCalledTimes(2);const body=fetcher.mock.calls[1][1].body;expect(body).not.toContain('Never upload me');expect(JSON.parse(body).writes[0].update.fields.goals.integerValue).toBe('1');await reportUsage({});expect(fetcher).toHaveBeenCalledTimes(2);
});
