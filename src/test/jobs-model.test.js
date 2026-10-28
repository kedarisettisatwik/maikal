import { expect, it } from 'vitest';
import { experienceMatch, graduationMatch, parseJobPage, parseSearchPage, roleType, selectJobs } from '../../scripts/linkedin-model.mjs';
import { linkedInJobUrl, canReadJobs } from '../jobs-model';

const now = Date.parse('2026-10-29T00:30:00Z');
const candidate = { id: '12345', url: 'https://in.linkedin.com/jobs/view/backend-engineer-at-example-12345', title: 'Backend Engineer', company: 'Example', location: 'Bengaluru, India', postedAt: '2026-10-28', role: 'Backend' };
const html = data => `<html><script type="application/ld+json">${JSON.stringify({ '@type': 'JobPosting', title: candidate.title, description: 'You need 1-3 years of software development experience. CTC: 12-18 LPA. Build APIs.', datePosted: '2026-10-28T12:00:00Z', hiringOrganization: { name: 'Example' }, ...data })}</script><ul><li class="description__job-criteria-item"><h3>Seniority level</h3><span>Entry level</span></li></ul></html>`;
it('keeps LinkedIn URLs only and restricts the section to the exact UID', () => {
  expect(linkedInJobUrl('https://in.linkedin.com/jobs/view/test-123?trackingId=x')).toBe('https://in.linkedin.com/jobs/view/test-123');
  expect(linkedInJobUrl('https://linkedin.com.evil.test/jobs/view/123')).toBe('');
  expect(linkedInJobUrl('https://example.com/careers')).toBe('');
  expect(canReadJobs('0kX2kfDq3KV9MIhtDV7IDpuXnfJ3')).toBe(true); expect(canReadJobs('another')).toBe(false);
});
it('matches two-year requirements and rejects higher experience in structured or written form', () => {
  expect(experienceMatch('1-3 years of software development experience').eligible).toBe(true);
  expect(experienceMatch('2+ years of experience').eligible).toBe(true);
  expect(experienceMatch('3-5 years of experience').eligible).toBe(false);
  expect(experienceMatch('No years stated', { monthsOfExperience: 36 }).eligible).toBe(false);
  expect(experienceMatch('No years stated', { monthsOfExperience: 24 }).confidence).toBe('explicit');
  expect(roleType('Senior Backend Engineer')).toBe(''); expect(roleType('Forward Deployed Engineer')).toBe('FDE');
});
it('does not invent graduation-year eligibility', () => {
  expect(graduationMatch('2024 graduates may apply').eligible).toBe(true);
  expect(graduationMatch('Only 2025 batch graduates may apply').eligible).toBe(false);
  expect(graduationMatch('Bachelor degree required').label).toContain('not specified');
});
it('extracts company, CTC and experience from a verified public listing', () => {
  const job = parseJobPage(html({}), candidate, now);
  expect(job.company).toBe('Example'); expect(job.ctc).toBe('12-18 LPA'); expect(job.graduation).toContain('not specified');
  expect(job.source).toBe('LinkedIn'); expect(job.applyUrl).toBe(candidate.url);
});
it('rejects closed, expired and unsuitable jobs', () => {
  expect(parseJobPage(html({}) + '<p>No longer accepting applications</p>', candidate, now)).toBeNull();
  expect(parseJobPage(html({ validThrough: '2026-10-20' }), candidate, now)).toBeNull();
  expect(parseJobPage(html({ description: 'Minimum 5+ years of experience' }), candidate, now)).toBeNull();
});
it('parses only relevant cards and deduplicates the daily selection at ten', () => {
  const cards = `<div class="base-search-card" data-entity-urn="urn:li:jobPosting:12345"><a class="base-card__full-link" href="${candidate.url}?ref=1"></a><h3 class="base-search-card__title">Backend Engineer</h3><h4 class="base-search-card__subtitle">Example</h4><span class="job-search-card__location">India</span><time datetime="2026-10-28">1 day ago</time></div>`;
  expect(parseSearchPage(cards)).toHaveLength(1);
  const jobs = Array.from({ length: 15 }, (_, i) => ({ ...candidate, id: String(i), experienceConfidence: 'explicit' }));
  expect(selectJobs([...jobs, jobs[0]], null, '2026-10-29')).toHaveLength(10);
  expect(selectJobs([jobs[0]], { editionDate: '2026-10-28', seen: { 0: now } }, '2026-10-29')).toHaveLength(0);
});
