import toast from 'react-hot-toast';
import { notify } from './notifications';
import { assetUrl } from './assets';
import { useEffect, useState } from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, validatePassword } from 'firebase/auth';
import { auth, authReady } from './firebase';
import { authError } from './model';
import Dashboard from './components/Dashboard.jsx';

export function AuthScreen() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const changeMode = next => { setMode(next); setPassword(''); setConfirm(''); setError(''); setMessage(''); };
  async function submit(e) {
    e.preventDefault(); setError(''); setMessage('');
    if (mode === 'signup' && password !== confirm) { setError('The passwords do not match.'); toast.error('The passwords do not match.'); return; }
    setBusy(true);
    try {
      await authReady;
      if (mode === 'forgot') {
        try { await sendPasswordResetEmail(auth, email.trim()); } catch (e) { if (e.code !== 'auth/user-not-found') throw e; }
        setMessage('If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.');
        toast.success('Password reset requested. Check your inbox.');
      } else if (mode === 'signup') {
        const policy = await validatePassword(auth, password);
        if (!policy.isValid) throw new Error('Use a password that meets the project requirements: try at least 8 characters with uppercase and lowercase letters, a number, and a symbol.');
        await createUserWithEmailAndPassword(auth, email.trim(), password);
        toast.success('Your account is ready. Welcome to Maikal!');
      } else { await signInWithEmailAndPassword(auth, email.trim(), password); toast.success('Welcome back!'); }
    } catch (e) { const message = authError(e); setError(message); toast.error(message); }
    finally { setBusy(false); }
  }
  const title = mode === 'signup' ? 'A fresh beginning.' : mode === 'forgot' ? 'Find your way back.' : 'Welcome back.';
  return <section className="signin">
    <img className="auth-logo" src={assetUrl('logo.png')} alt="Maikal" />
    <div className="kicker">Your personal daily edition</div><h1>{title}</h1>
    <p>{mode === 'signup' ? 'Create your space for goals, plans, and a more intentional day.' : mode === 'forgot' ? 'Enter your email and we’ll send you a link to reset your password.' : 'Your goals, plans, and daily stories are waiting.'}</p>
    <form onSubmit={submit}>
      <fieldset disabled={busy} className="auth-fields">
        <label className="field"><span>Email address</span><input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" /></label>
        {mode !== 'forgot' && <label className="field"><span>Password</span><input type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 6 : undefined} value={password} onChange={e => setPassword(e.target.value)} required placeholder={mode === 'signup' ? 'Choose a strong password' : 'Your password'} /></label>}
        {mode === 'signup' && <label className="field"><span>Confirm password</span><input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="Enter your password again" /></label>}
        <button className="primary wide" type="submit">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}</button>
      </fieldset>
      {error && <div className="error" role="alert">{error}</div>}{message && <p className="auth-success" role="status">{message}</p>}
    </form>
    <div className="auth-links">{mode === 'signin' ? <><button disabled={busy} onClick={() => changeMode('forgot')}>Forgot password?</button><span>New here? <button disabled={busy} onClick={() => changeMode('signup')}>Create an account</button></span></> : <button disabled={busy} onClick={() => changeMode('signin')}>Back to sign in</button>}</div>
    <p className="small" style={{ marginBottom: 0 }}>Your sign-in is remembered on this browser until you sign out.</p>
  </section>;
}
export default function App() {
  const [session, setSession] = useState({ loading: true, user: null, error: '' });
  useEffect(() => {
    let live = true, stop;
    authReady.then(() => { if (live) stop = onAuthStateChanged(auth, user => { if (user?.isAnonymous) { signOut(auth).catch(() => {}); return; } setSession({ loading: false, user, error: '' }); }, error => setSession({ loading: false, user: null, error: authError(error) })); }).catch(error => { if (live) setSession({ loading: false, user: null, error: authError(error) }); });
    return () => { live = false; stop?.(); };
  }, []);
  if (session.loading) return <section className="signin"><img className="auth-logo" src={assetUrl('logo.png')} alt="Maikal" /><h1>Your daily edition.</h1><p role="status">Restoring your session…</p></section>;
  return <>{session.user ? <Dashboard key={session.user.uid} user={session.user} notify={notify} /> : <>{session.error && <p className="error global-error" role="alert">{session.error}</p>}<AuthScreen /></>}</>;
}
