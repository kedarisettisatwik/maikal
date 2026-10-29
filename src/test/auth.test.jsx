import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const mocks = vi.hoisted(() => ({ native: false, signin: vi.fn().mockResolvedValue({}), signup: vi.fn().mockResolvedValue({}), reset: vi.fn().mockResolvedValue(), policy: vi.fn().mockResolvedValue({ isValid: true }) }));
vi.mock('../native-notifications', () => ({ isNative: () => mocks.native }));
afterEach(() => { mocks.native = false; });
vi.mock('../firebase', () => ({ auth: {}, authReady: Promise.resolve() }));
vi.mock('firebase/auth', () => ({ createUserWithEmailAndPassword: mocks.signup, signInWithEmailAndPassword: mocks.signin, sendPasswordResetEmail: mocks.reset, validatePassword: mocks.policy, onAuthStateChanged: vi.fn(), signOut: vi.fn() }));
vi.mock('../components/Dashboard.jsx', () => ({ default: () => null }));
import { AuthScreen } from '../App';

describe('authentication forms', () => {
  it('offers only sign-in inside the APK', async () => {
    mocks.native = true;
    const user = userEvent.setup(); render(<AuthScreen />);
    expect(screen.queryByRole('button', { name: 'Forgot password?' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create an account' })).toBeNull();
    await user.type(screen.getByLabelText('Email address'), 'me@example.com');
    await user.type(screen.getByLabelText('Password'), 'Secret123!');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(mocks.signin).toHaveBeenCalledWith({}, 'me@example.com', 'Secret123!');
  });
  it('signs in with email and password', async () => {
    const user = userEvent.setup(); render(<AuthScreen />);
    await user.type(screen.getByLabelText('Email address'), 'me@example.com'); await user.type(screen.getByLabelText('Password'), 'Secret123!'); await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(mocks.signin).toHaveBeenCalledWith({}, 'me@example.com', 'Secret123!');
    expect(screen.getByAltText('Maikal').getAttribute('src')).toBe(`${import.meta.env.BASE_URL}logo.png`);
  });
  it('offers no signup or password reset controls on the website', () => {
    render(<AuthScreen />);
    expect(screen.queryByRole('button', { name: 'Forgot password?' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Create an account' })).toBeNull();
    expect(screen.queryByLabelText('Confirm password')).toBeNull();
  });
});