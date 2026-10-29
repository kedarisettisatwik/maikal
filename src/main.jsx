import React from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { registerSW } from 'virtual:pwa-register';
import { createRoot } from 'react-dom/client';
import { isNative } from './native-notifications';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /><Toaster position="top-center" toastOptions={{ duration: 4200, style: { background: '#253439', color: '#faf8ef', borderRadius: '6px' } }} /></React.StrictMode>);

if (isNative()) document.querySelector('meta[name=viewport]').setAttribute('content', 'width=1200, initial-scale=0.33, minimum-scale=0.1, maximum-scale=5, user-scalable=yes');
const updateSW = isNative() ? () => {} : registerSW({
  immediate: true,
  onNeedRefresh() {
    toast(t => <span>A Maikal update is ready. <button type="button" onClick={() => { toast.dismiss(t.id); updateSW(true); }}>Reload</button></span>, { duration: Infinity });
  },
  onRegisterError(error) { console.warn('App installation support could not start:', error.message); },
});
