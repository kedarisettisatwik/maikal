import {afterEach,expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
vi.mock('../build-mode',()=>({localOnly:true}));
import {reportUsage as realReportUsage} from '../usage';
import {reportUsage} from '../local-usage';
import AppInfo from '../components/AppInfo';
afterEach(()=>{localStorage.clear();vi.unstubAllGlobals()});
it('local usage never fetches and clears only retired analytics state',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 localStorage.setItem('mantra-usage-auth','old-token');localStorage.setItem('mantra-usage-sent','old-report');localStorage.setItem('maikal-v2-local','private diary');
 await realReportUsage({});await reportUsage({});
 expect(fetcher).not.toHaveBeenCalled();expect(localStorage.getItem('mantra-usage-auth')).toBeNull();expect(localStorage.getItem('mantra-usage-sent')).toBeNull();expect(localStorage.getItem('maikal-v2-local')).toBe('private diary');
});
it('local guide describes on-device privacy without claiming uploads',()=>{
 render(<AppInfo onBack={()=>{}}/>);expect(screen.getByRole('heading',{name:'On-device privacy'})).toBeTruthy();expect(screen.queryByRole('heading',{name:'Anonymous usage information'})).toBeNull();
});
