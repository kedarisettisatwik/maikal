import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
vi.mock('react-hot-toast', () => ({ default: Object.assign(vi.fn(), { success: vi.fn() }) }));
import InstallAppButton from '../components/InstallAppButton';
it('uses the browser install prompt when it is available', async () => {
  const prompt = vi.fn().mockResolvedValue();
  render(<InstallAppButton />);
  const event = new Event('beforeinstallprompt', { cancelable: true });
  Object.assign(event, { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  fireEvent(window, event); fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
  await waitFor(() => expect(prompt).toHaveBeenCalledOnce()); expect(event.defaultPrevented).toBe(true);
});
it('hides installation controls when running as an installed app', () => {
  vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true });
  render(<InstallAppButton />); expect(screen.queryByRole('button', { name: 'Install app' })).toBeNull();
});
