import { afterEach, expect, it, vi } from 'vitest';
import { assetUrl } from '../assets';
afterEach(() => vi.unstubAllEnvs());
it('prefixes logo and icons with the deployed repository path', () => {
  vi.stubEnv('BASE_URL', '/maikal/');
  expect(assetUrl('logo.png')).toBe('/maikal/logo.png');
  expect(assetUrl('/iconsGoal/icon1.png')).toBe('/maikal/iconsGoal/icon1.png');
});
