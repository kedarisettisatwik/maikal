// Local edition has no analytics client. Remove only retired analytics credentials.
export async function reportUsage() {
  try { localStorage.removeItem('mantra-usage-auth'); localStorage.removeItem('mantra-usage-sent'); } catch {}
}
