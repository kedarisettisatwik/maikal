export async function deliverEdition(db, auth, edition) {
  // Discover recipients first; missing Auth permissions must not report a successful delivery.
  const users = []; let token;
  do {
    const page = await auth.listUsers(1000, token);
    users.push(...page.users.filter(user => !user.disabled).map(user => user.uid));
    token = page.pageToken;
  } while (token);
  await db.doc('newsEditions/latest').set(edition);
  // News copies use the app's existing account-isolation rules; no public collection is opened.
  for (let start = 0; start < users.length; start += 400) {
    const batch = db.batch();
    for (const uid of users.slice(start, start + 400)) batch.set(db.doc(`users/${uid}/maikalRecords/news_latest`), { ...edition, id: 'news_latest', type: 'news', updatedAt: edition.fetchedAt });
    await batch.commit();
  }
  return users.length;
}
