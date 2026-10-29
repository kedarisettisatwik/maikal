// A restriction stops requests immediately, but must not discard verified jobs.
export async function verifyCandidates(ordered, { readPage, parse, select, previous, editionDate, now, pause, log = console.log, warn = console.warn }) {
  const matches = [], checked = new Set();
  let restricted = false;
  for (const candidate of ordered.slice(0, 50)) {
    if (checked.has(candidate.id)) continue;
    checked.add(candidate.id);
    try {
      const job = parse(await readPage(candidate.url), candidate, now);
      if (job) matches.push(job);
    } catch (error) {
      if (error.restricted) { restricted = true; warn(error.message); break; }
      warn(`A public listing could not be verified (${error.name || 'error'}).`);
    }
    if (checked.size % 10 === 0) log(`Verified ${checked.size} listing(s); ${matches.length} potential match(es).`);
    if (select(matches, previous, editionDate).length >= 10) break;
    await pause(2000);
  }
  return { jobs: select(matches, previous, editionDate), checked, restricted };
}
