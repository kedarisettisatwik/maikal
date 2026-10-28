import { parseDocument } from 'htmlparser2';
import { JOB_PROFILE, linkedInJobUrl } from '../src/jobs-model.js';
import { plainFeedContent } from './news-model.mjs';

function nodes(root, predicate) {
  const result = [];
  function walk(node) { if (predicate(node)) result.push(node); for (const child of node.children || []) walk(child); }
  walk(root); return result;
}
const hasClass = (node, name) => (node.attribs?.class || '').split(/\s+/).includes(name);
function text(node) { if (!node || ['script', 'style'].includes(node.name)) return ''; return node.type === 'text' ? node.data : (node.children || []).map(text).join(' ').replace(/\s+/g, ' ').trim(); }
const byClass = (root, name) => nodes(root, node => hasClass(node, name))[0];
const clean = value => plainFeedContent(typeof value === 'string' ? value : '').text;
export function roleType(title) {
  if (/\b(senior|sr\.?|lead|staff|principal|manager|architect|intern|trainee|director)\b/i.test(title)) return '';
  if (/full[ -]?stack/i.test(title)) return 'Full stack';
  if (/back[ -]?end/i.test(title)) return 'Backend';
  if (/forward[ -]deployed|\bFDE\b/i.test(title)) return 'FDE';
  if (/software (?:development |application )?engineer|\bSDE\b/i.test(title)) return 'SDE';
  return '';
}
export function parseSearchPage(html) {
  const root = parseDocument(html);
  const cards = nodes(root, node => hasClass(node, 'base-search-card'));
  const unique = new Map();
  for (const card of cards) {
    const url = linkedInJobUrl(byClass(card, 'base-card__full-link')?.attribs?.href);
    const title = text(byClass(card, 'base-search-card__title'));
    const id = (card.attribs?.['data-entity-urn'] || '').split(':').pop() || url.match(/(?:-|\/)(\d+)\/?$/)?.[1];
    if (!url || !id || !roleType(title)) continue;
    const dateNode = nodes(card, n => n.name === 'time')[0];
    unique.set(id, { id, url, title, company: text(byClass(card, 'base-search-card__subtitle')), location: text(byClass(card, 'job-search-card__location')), postedAt: dateNode?.attribs?.datetime || '', postedLabel: text(dateNode), role: roleType(title) });
  }
  return [...unique.values()];
}
export function experienceMatch(description, structured = '') {
  const input = `${description} ${typeof structured === 'string' ? structured : JSON.stringify(structured)}`;
  const matches = [...input.matchAll(/\b(\d{1,2})(?:\s*(?:-|–|—|to)\s*(\d{1,2}))?\s*(\+)?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:(?:professional|relevant|hands[ -]on|software|engineering|development|industry|work|technical|related|practical)\s+){0,4}experience\b/gi)];
  const reversed = [...input.matchAll(/(?:experience|required experience)\s*[:\-]?\s*(\d{1,2})(?:\s*(?:-|–|—|to)\s*(\d{1,2}))?\s*(\+)?\s*(?:years?|yrs?)/gi)];
  const requirements = [...matches, ...reversed].map(m => ({ min: Number(m[1]), max: m[2] ? Number(m[2]) : Infinity, label: m[0] }));
  const months = typeof structured === 'object' && structured ? Number(structured.monthsOfExperience) : NaN;
  if (Number.isFinite(months) && months > JOB_PROFILE.experienceYears * 12) return { eligible: false, label: `At least ${months / 12} years (LinkedIn requirement)`, confidence: 'excluded' };
  const strict = requirements.find(r => r.min > JOB_PROFILE.experienceYears);
  if (strict) return { eligible: false, label: strict.label, confidence: 'excluded' };
  const fitting = requirements.find(r => r.min <= JOB_PROFILE.experienceYears && r.max >= JOB_PROFILE.experienceYears);
  if (fitting) return { eligible: true, label: fitting.label.slice(0, 150), confidence: 'explicit' };
  if (requirements.length) return { eligible: false, label: requirements[0].label, confidence: 'excluded' };
  if (Number.isFinite(months)) return { eligible: true, label: `At least ${months / 12} years (LinkedIn requirement)`, confidence: 'explicit' };
  return { eligible: true, label: 'Not specified — review the posting', confidence: 'not-specified' };
}
export function graduationMatch(description) {
  const matches = [...description.matchAll(/(?:batch|graduat(?:ed|ion|es?|ing)|pass(?:ed)?[ -]?out)[^.!?\n]{0,55}\b(20\d{2})\b|\b(20\d{2})\b[^.!?\n]{0,30}(?:batch|graduat(?:es?|ion)|pass(?:ed)?[ -]?out)/gi)];
  if (!matches.length) return { eligible: true, label: 'Graduation year not specified — verify eligibility', explicit: false };
  const contexts = matches.map(m => m[0]).join(' '), years = contexts.match(/20\d{2}/g) || [];
  if (years.includes(String(JOB_PROFILE.graduationYear))) return { eligible: true, label: '2024 graduates mentioned', explicit: true };
  return { eligible: false, label: 'A different graduation batch is specified', explicit: true };
}
function salaryFrom(posting, root, description) {
  const ctc = description.match(/\b(?:CTC|cost to company)\s*(?::|of|is|up to|-)?\s*((?:INR|Rs\.?|₹)?\s*\d[\d,.]*(?:\s*(?:-|–|to)\s*(?:INR|Rs\.?|₹)?\s*\d[\d,.]*)?\s*(?:LPA|lakhs?(?:\s+per\s+annum)?|lacs?(?:\s+per\s+annum)?|crores?(?:\s+per\s+annum)?))/i)?.[1];
  const salary = posting.baseSalary, amount = salary?.value;
  let pay = '';
  if (amount && typeof amount === 'object' && (amount.value || amount.minValue || amount.maxValue)) {
    const format = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: salary.currency || 'INR', maximumFractionDigits: 0 }).format(n);
    pay = amount.value ? format(amount.value) : `${amount.minValue ? format(amount.minValue) : ''}${amount.minValue && amount.maxValue ? ' – ' : ''}${amount.maxValue ? format(amount.maxValue) : ''}`;
    pay += ` / ${String(amount.unitText || 'period not specified').toLowerCase()} (base pay)`;
  }
  if (!pay) pay = text(byClass(root, 'compensation__salary')).slice(0, 180);
  return { ctc: ctc?.trim() || '', listedPay: pay };
}
export function parseJobPage(html, candidate, now = Date.now()) {
  const root = parseDocument(html);
  if (/no longer accepting applications/i.test(text(root))) return null;
  let posting;
  for (const node of nodes(root, node => node.name === 'script' && node.attribs?.type === 'application/ld+json')) {
    let data; try { data = JSON.parse((node.children || []).map(child => child.data || '').join('')); } catch { continue; }
    const list = Array.isArray(data) ? data : data['@graph'] || [data];
    posting = list.find(value => value?.['@type'] === 'JobPosting');
    if (posting) break;
  }
  const description = posting ? clean(posting.description) : text(byClass(root, 'show-more-less-html__markup'));
  const title = clean(posting?.title) || candidate.title, role = roleType(title);
  if (!description || !role) return null;
  if (posting?.validThrough && Date.parse(posting.validThrough) < now) return null;
  const postedAt = posting?.datePosted || candidate.postedAt;
  if (!Number.isFinite(Date.parse(postedAt)) || Date.parse(postedAt) < now - 48 * 3600000 || Date.parse(postedAt) > now + 3600000) return null;
  const experience = experienceMatch(description, posting?.experienceRequirements);
  if (!experience.eligible) return null;
  const graduation = graduationMatch(description); if (!graduation.eligible) return null;
  const seniority = text(nodes(root, node => hasClass(node, 'description__job-criteria-item')).find(node => /seniority level/i.test(text(node))));
  if (experience.confidence === 'not-specified' && seniority && !/entry level|associate/i.test(seniority)) return null;
  const company = clean(posting?.hiringOrganization?.name) || candidate.company;
  const location = candidate.location || text(byClass(root, 'topcard__flavor--bullet'));
  if (!company || !location || !/india|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|delhi|noida|gurugram|gurgaon|kolkata/i.test(location)) return null;
  const url = linkedInJobUrl(candidate.url); if (!url) return null;
  const pay = salaryFrom(posting || {}, root, description);
  return { ...candidate, title, role, company, location, url, applyUrl: url, postedAt, experience: experience.label, experienceConfidence: experience.confidence, graduation: graduation.label, ...pay, checkedAt: now, source: 'LinkedIn', matchNote: experience.confidence === 'explicit' ? 'Posted experience range accepts 2 years; verify the remaining requirements.' : 'Early-career listing; exact experience and eligibility need review.', summary: description.slice(0, 240) };
}
export function selectJobs(candidates, previous, editionDate) {
  const seen = previous?.seen || {}, current = previous?.editionDate === editionDate ? new Set((previous.jobs || []).map(job => job.id)) : new Set();
  return [...new Map(candidates.map(job => [job.id, job])).values()].filter(job => !seen[job.id] || current.has(job.id)).sort((a, b) => Number(b.experienceConfidence === 'explicit') - Number(a.experienceConfidence === 'explicit') || Date.parse(b.postedAt) - Date.parse(a.postedAt)).slice(0, JOB_PROFILE.limit);
}
