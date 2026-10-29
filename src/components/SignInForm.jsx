import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import toast from 'react-hot-toast';
import { auth, authReady } from '../firebase';
import { authError } from '../model';
import { assetUrl } from '../assets';

export default function SignInForm() {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function submit(e){e.preventDefault();setBusy(true);setError('');try{await authReady;await signInWithEmailAndPassword(auth,email.trim(),password);toast.success('Welcome back!')}catch(e){const message=authError(e);setError(message);toast.error(message)}finally{setBusy(false)}}
  return <section className="signin"><img className="auth-logo" src={assetUrl('logo.png')} alt="Maikal"/><div className="kicker">Your personal daily edition</div><h1>Welcome back.</h1><p>Your goals, plans, and daily stories are waiting.</p><form onSubmit={submit}><fieldset disabled={busy} className="auth-fields"><label className="field"><span>Email address</span><input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label className="field"><span>Password</span><input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Your password"/></label><button className="primary wide" type="submit">{busy?'Please wait…':'Sign in'}</button></fieldset>{error&&<div className="error" role="alert">{error}</div>}</form><p className="small">Your sign-in is remembered on this browser until you sign out.</p></section>;
}
