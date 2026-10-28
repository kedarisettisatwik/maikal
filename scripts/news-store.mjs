import { NEWS_READER_UID } from '../src/news-model.js';

export async function deliverEdition(db, auth, edition) {
  const user = await auth.getUser(NEWS_READER_UID);
  if (user.disabled) throw new Error('The configured news reader account is disabled.');
  const batch = db.batch();
  batch.set(db.doc('newsEditions/latest'), edition);
  batch.set(db.doc(`users/${NEWS_READER_UID}/maikalRecords/news_latest`), { ...edition, id: 'news_latest', type: 'news', updatedAt: edition.fetchedAt });
  await batch.commit();
  return 1;
}
