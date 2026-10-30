import {describe,it,expect} from 'vitest';
import {makeNote,noteLinks,noteSource,safeNoteUrl,shareDraft} from '../notes-model';
import {mergeRecords} from '../model';
describe('saved notes',()=>{
  it('extracts real web links without punctuation or unsafe schemes',()=>{
    expect(noteLinks('Watch https://www.instagram.com/reel/123/. Then https://example.com/item?x=1&y=2).').map(l=>l.url)).toEqual(['https://www.instagram.com/reel/123/','https://example.com/item?x=1&y=2']);
    expect(safeNoteUrl('javascript:alert(1)')).toBe('');expect(safeNoteUrl('https://user:password@example.com')).toBe('');
    expect(noteSource('https://instagram.com.evil.test/')).toBe('Web');expect(noteSource('https://amzn.in/d/123')).toBe('Amazon');
  });
  it('turns a shared URL into a deterministic draft requiring description and tags',()=>{
    const draft=shareDraft({id:'request-1',text:'https://www.instagram.com/reel/123/'});
    expect(draft.id).toBe('note_share_request-1');expect(draft.body).toBe('');expect(draft.source).toBe('Instagram');
    expect(()=>makeNote(draft)).toThrow('description');const note=makeNote({...draft,body:'Watch this later',tags:'Fitness, #fitness, Saved'},undefined,100);expect(note.tags).toEqual(['fitness','saved']);expect(note.type).toBe('note');
  });
  it('preserves checklist completion during editing and supports note sync',()=>{
    let note=makeNote({noteType:'checklist',title:'Weekend',body:'Clean room\nWater plants',tags:'home'},undefined,100);note.items[0].done=true;
    const updated=makeNote({...note,body:'Clean room\nWater plants\nRead'},note,200);expect(updated.items[0].done).toBe(true);expect(updated.items[2].done).toBe(false);
    expect(mergeRecords({}, {}, [{...updated,updatedAt:300}]).records[note.id].type).toBe('note');
  });
});
