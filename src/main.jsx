import React from 'react';
import { Toaster } from 'react-hot-toast';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /><Toaster position="top-center" toastOptions={{ duration: 4200, style: { background: '#253439', color: '#faf8ef', borderRadius: '6px' } }} /></React.StrictMode>);
