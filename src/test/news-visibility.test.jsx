import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
vi.mock('../firebase', () => ({ auth: {} }));
vi.mock('../useRecords', () => ({ default: () => ({ records: {}, save: vi.fn(), remove: vi.fn(), error: '', status: 'Synced' }) }));
vi.mock('../components/NewsSection', () => ({ default: ({ uid }) => <h2>News for {uid}</h2> }));
vi.mock('../components/JobsSection', () => ({ default: ({ uid }) => <h2>Jobs for {uid}</h2> }));
vi.mock('../components/LeetcodeSection', () => ({ default: ({ uid }) => <h2>Leetcode for {uid}</h2> }));
import Dashboard from '../components/Dashboard';
import { NEWS_READER_UID } from '../news-model';

it('includes News at the bottom for the designated user', () => {
  render(<Dashboard user={{ uid: NEWS_READER_UID, email: 'reader@example.com' }} notify={vi.fn()} />);
  expect(screen.getByRole('heading', { name: `News for ${NEWS_READER_UID}` })).toBeTruthy();
  expect(screen.getByRole('heading', { name: `Jobs for ${NEWS_READER_UID}` })).toBeTruthy();
  expect(screen.getByRole('heading', { name: `Leetcode for ${NEWS_READER_UID}` })).toBeTruthy();
});
it('keeps other accounts functional without rendering News', () => {
  render(<Dashboard user={{ uid: 'another-user', email: 'another@example.com' }} notify={vi.fn()} />);
  expect(screen.queryByRole('heading', { name: /News for/ })).toBeNull();
  expect(screen.queryByRole('heading', { name: /Jobs for/ })).toBeNull();
  expect(screen.queryByRole('heading', { name: /Leetcode for/ })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Today’s goals' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Recent transactions' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Reports' })).toBeTruthy();
});
