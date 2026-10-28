import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
vi.mock('../useNews', () => ({ default: () => ({ edition: null, loading: false, error: '' }) }));
import { NewsEdition } from '../components/NewsSection';

const now = Date.parse('2026-10-29T00:30:00Z');
const article = { id: 'a', title: 'New research published', categories: ['technology'], url: 'https://example.com/story', source: 'Example News', sourceUrl: 'https://example.com', publishedAt: now - 3600000, summary: 'A short attributed summary.', references: [{ label: 'Research report', url: 'https://example.com/report.pdf' }, { label: 'Unsafe link', url: 'javascript:alert(1)' }] };
it('renders the News section, six categories, source, time, and safe report links', () => {
  render(<NewsEdition edition={{ fetchedAt: now, articles: [article], sources: [] }} now={now} />);
  expect(screen.getByRole('heading', { name: 'News', level: 2 })).toBeTruthy();
  for (const category of ['India', 'World', 'Technology', 'Business', 'Layoffs', 'Sports']) expect(screen.getByRole('heading', { name: category, level: 3 })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'New research published' }).getAttribute('href')).toBe(article.url);
  expect(screen.getByRole('link', { name: 'Example News' })).toBeTruthy();
  expect(screen.getByRole('link', { name: /Research report/ }).getAttribute('href')).toBe('https://example.com/report.pdf');
  expect(screen.queryByText('Unsafe link')).toBeNull();
  expect(screen.getByText(/Morning edition · 6:00 AM IST/)).toBeTruthy();
});
it('has an honest empty state while awaiting the first edition', () => {
  render(<NewsEdition edition={null} />);
  expect(screen.getByText(/will appear here after the next morning update/)).toBeTruthy();
});
it('does not show expired articles as the latest news', () => {
  render(<NewsEdition edition={{ articles: [{ ...article, publishedAt: now - 3 * 86400000 }] }} now={now} />);
  expect(screen.queryByText('New research published')).toBeNull();
});
