import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const mocks = vi.hoisted(() => ({ signin: vi.fn().mockResolvedValue({}), signup: vi.fn().mockResolvedValue({}), reset: vi.fn().mockResolvedValue(), policy: vi.fn().mockResolvedValue({ isValid: true }) }));
vi.mock('../firebase', () => ({ auth: {}, authReady: Promise.resolve() }));
vi.mock('firebase/auth', () => ({ createUserWithEmailAndPassword: mocks.signup, signInWithEmailAndPassword: mocks.signin, sendPasswordResetEmail: mocks.reset, validatePassword: mocks.policy, onAuthStateChanged: vi.fn(), signOut: vi.fn() }));
vi.mock('../components/Dashboard.jsx', () => ({ default: () => null }));
import { AuthScreen } from '../App';

describe('authentication forms', () => {
  it('signs in with email and password', async () => {
    const user = userEvent.setup(); render(<AuthScreen />);
    await user.type(screen.getByLabelText('Email address'), 'me@example.com'); await user.type(screen.getByLabelText('Password'), 'Secret123!'); await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(mocks.signin).toHaveBeenCalledWith({}, 'me@example.com', 'Secret123!');
    expect(screen.getByAltText('Maikal').getAttribute('src')).toBe(`${import.meta.env.BASE_URL}logo.png`);
  });
  it('rejects mismatched signup passwords before contacting Firebase', async () => {
    mocks.signup.mockClear(); const user = userEvent.setup(); render(<AuthScreen />);
    await user.click(screen.getByRole('button', { name: 'Create an account' })); await user.type(screen.getByLabelText('Email address'), 'new@example.com'); await user.type(screen.getByLabelText('Password', { exact: true }), 'Secret123!'); await user.type(screen.getByLabelText('Confirm password'), 'Different123!'); await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert').textContent).toContain('do not match'); expect(mocks.signup).not.toHaveBeenCalled();
  });
  it('creates an account after validating the password policy', async () => {
    const user = userEvent.setup(); render(<AuthScreen />);
    await user.click(screen.getByRole('button', { name: 'Create an account' })); await user.type(screen.getByLabelText('Email address'), 'new@example.com'); await user.type(screen.getByLabelText('Password', { exact: true }), 'Secret123!'); await user.type(screen.getByLabelText('Confirm password'), 'Secret123!'); await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(mocks.policy).toHaveBeenCalledWith({}, 'Secret123!'); expect(mocks.signup).toHaveBeenCalledWith({}, 'new@example.com', 'Secret123!');
  });
  it('sends a password reset email without asking for a password', async () => {
    const user = userEvent.setup(); render(<AuthScreen />); await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
    expect(screen.queryByLabelText('Password')).toBeNull(); await user.type(screen.getByLabelText('Email address'), 'me@example.com'); await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(mocks.reset).toHaveBeenCalledWith({}, 'me@example.com'); expect(screen.getByRole('status').textContent).toContain('password reset link');
  });
});
