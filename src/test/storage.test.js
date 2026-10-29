import { beforeEach, describe, expect, it } from 'vitest';
import { cloudEnabled, LOCAL_UID, localKey, mergeLocalIntoCloud, readCache } from '../storage';
import { NEWS_READER_UID } from '../news-model';

beforeEach(() => localStorage.clear());
describe('local diary and authorized cloud merge', () => {
  it('only enables cloud for the designated UID', () => {
    expect(cloudEnabled(LOCAL_UID)).toBe(false);
    expect(cloudEnabled('another-user')).toBe(false);
    expect(cloudEnabled(NEWS_READER_UID)).toBe(true);
  });
  it('merges records and tombstones without replacing newer cloud records', () => {
    const key = `maikal-v2-${NEWS_READER_UID}`;
    localStorage.setItem(localKey, JSON.stringify({ records: {
      a: { id: 'a', type: 'goal', updatedAt: 10 },
      b: { id: 'b', type: 'transaction', deleted: true, updatedAt: 30 },
    } }));
    localStorage.setItem(key, JSON.stringify({ records: { a: { id: 'a', type: 'goal', updatedAt: 20 } }, dirty: {} }));
    mergeLocalIntoCloud(NEWS_READER_UID);
    expect(readCache(key).records.a.updatedAt).toBe(20);
    expect(readCache(key).records.b.deleted).toBe(true);
    expect(readCache(key).dirty).toEqual({ b: true });
    expect(localStorage.getItem(localKey)).toBeNull();
    mergeLocalIntoCloud(NEWS_READER_UID);
    expect(readCache(key).dirty.b).toBe(true);
  });
  it('never moves local records into another account', () => {
    localStorage.setItem(localKey, JSON.stringify({ records: { a: { id: 'a', type: 'goal' } } }));
    mergeLocalIntoCloud('another-user');
    expect(readCache(localKey).records.a).toBeDefined();
    expect(localStorage.getItem('maikal-v2-another-user')).toBeNull();
  });
});
