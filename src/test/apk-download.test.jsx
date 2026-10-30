import {it,expect,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
vi.mock('../native-notifications',()=>({isNative:()=>false}));
import ApkDownload from '../components/ApkDownload';
import {NEWS_READER_UID} from '../news-model';
it('offers the local APK without a connected Firebase account',()=>{
  render(<ApkDownload uid="local"/>);expect(screen.getByRole('link').getAttribute('href')).toContain('/android-v1.9.0/Maikal-Local.apk');
});
it('switches APK edition immediately when Firebase connects or disconnects',()=>{
  const view=render(<ApkDownload uid="local"/>);view.rerender(<ApkDownload uid={NEWS_READER_UID}/>);expect(screen.getByRole('link').getAttribute('href')).toContain('Maikal-Firebase.apk');view.rerender(<ApkDownload uid="local"/>);expect(screen.getByRole('link').getAttribute('href')).toContain('Maikal-Local.apk');
});
it('waits until the saved sign-in session is restored before offering a download',()=>{
  render(<ApkDownload uid="local" restoring/>);expect(screen.queryByRole('link')).toBeNull();expect(screen.getByRole('button').disabled).toBe(true);
});
