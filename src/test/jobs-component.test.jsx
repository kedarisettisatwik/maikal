import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
vi.mock('../useJobs', () => ({ default: () => ({ edition: null, loading: false, error: '' }) }));
import { JobsEdition } from '../components/JobsSection';

it('shows the company, unlisted CTC label and LinkedIn apply link honestly', () => {
  render(<JobsEdition edition={{ fetchedAt: Date.now(), jobs: [{ id: 'one', title: 'Backend Engineer', company: 'Example Company', location: 'India', role: 'Backend', url: 'https://in.linkedin.com/jobs/view/backend-123', postedAt: '2026-10-29', experience: '1-3 years of experience', graduation: 'Year not specified — verify eligibility' }] }} />);
  expect(screen.getByText('Example Company')).toBeTruthy(); expect(screen.getByText('Not disclosed')).toBeTruthy();
  expect(screen.getByRole('link', { name: /View & apply on LinkedIn/ }).getAttribute('href')).toBe('https://in.linkedin.com/jobs/view/backend-123');
});
it('does not render non-LinkedIn listings', () => {
  render(<JobsEdition edition={{ jobs: [{ id: 'bad', title: 'Wrong source', url: 'https://other.example/jobs' }] }} />);
  expect(screen.queryByText('Wrong source')).toBeNull(); expect(screen.getByText(/No new matching LinkedIn/)).toBeTruthy();
});

it('cleans HTML and repeatedly encoded markup in saved job descriptions', () => {
  render(<JobsEdition edition={{ jobs: [{ id: 'encoded', title: 'Developer', company: 'Pallav Technologies', url: 'https://in.linkedin.com/jobs/view/developer-456', summary: '&amp;lt;p&amp;gt;&amp;lt;strong&amp;gt;Nine million calls a day. Profitable. Built lean.&amp;lt;/strong&amp;gt;&amp;lt;/p&amp;gt;&lt;p&gt;2–4 years · Gurgaon&lt;/p&gt;' }] }} />);
  const summary = document.querySelector('.job-summary');
  expect(summary.textContent).toBe('Nine million calls a day. Profitable. Built lean. 2–4 years · Gurgaon');
  expect(summary.querySelector('strong')).toBeNull();
});
