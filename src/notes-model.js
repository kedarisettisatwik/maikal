export const noteTypes = ['link', 'text', 'checklist'];
export function safeNoteUrl(value) {
  try { const url = new URL(String(value).trim()); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function noteLinks(text) {
  return [...String(text || '').matchAll(/https?:\/\/[^\s<>"']+/gi)].map(match => {
    let raw = match[0].replace(/[.,;!?]+$/, '');
    while (raw.endsWith(')') && (raw.match(/\)/g)||[]).length > (raw.match(/\(/g)||[]).length) raw = raw.slice(0,-1);
    return { text: raw, url: safeNoteUrl(raw), index: match.index };
  }).filter(link => link.url);
}
export function noteSource(url) {
  const safe = safeNoteUrl(url); if (!safe) return 'Written here';
  const host = new URL(safe).hostname.toLowerCase();
  if (/(^|\.)instagram\.com$/.test(host)) return 'Instagram';
  if (/(^|\.)(amazon\.[a-z.]+|amzn\.(to|in))$/.test(host)) return 'Amazon';
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return 'YouTube';
  if (/(^|\.)(facebook\.com|fb\.watch)$/.test(host)) return 'Facebook';
  return 'Web';
}
export const normalizeTags = value => [...new Set((Array.isArray(value) ? value : String(value || '').split(',')).map(tag => tag.trim().replace(/^#+/,'').toLowerCase()).filter(Boolean))].slice(0,30).map(tag => tag.slice(0,40));
export function shareDraft(share) {
  const first = noteLinks(share.text)[0], url = first?.url || '';
  return { id:'note_share_'+share.id, noteType:url?'link':'text', title:(share.title || (url ? 'Saved from '+noteSource(url) : 'Shared note')).slice(0,150), url, body:String(share.text||'').replace(first?.text||'\0','').trim(), tags:[], source:url?noteSource(url):'Shared text', shared:true };
}
export function makeNote(input, previous, now = Date.now()) {
  const title=String(input.title||'').trim(), body=String(input.body||'').trim(), kind=input.noteType;
  if(!noteTypes.includes(kind)) throw Error('Choose a note type.');
  if(!title || title.length>150) throw Error('Enter a title of up to 150 characters.');
  if(body.length>16000) throw Error('Keep your note under 16,000 characters.');
  const url=kind==='link'?safeNoteUrl(input.url):'';
  if(kind==='link'&&!url) throw Error('Enter a valid http or https link.');
  const tags=normalizeTags(input.tags);
  if(input.shared&&(!body||!tags.length)) throw Error('Add a description and at least one tag for your shared note.');
  if(kind==='text'&&!body) throw Error('Enter your note text.');
  const items=kind==='checklist'?body.split('\n').map(s=>s.trim()).filter(Boolean).map((text,index)=>({id:previous?.items?.[index]?.text===text?previous.items[index].id:crypto.randomUUID(),text,done:previous?.items?.find(item=>item.text===text)?.done||false})):[];
  if(kind==='checklist'&&!items.length) throw Error('Add at least one checklist item.');
  if(items.length>200) throw Error('Use up to 200 checklist items.');
  return { id:previous?.id||input.id||crypto.randomUUID(), type:'note', noteType:kind, title, body:kind==='checklist'?'':body, url, tags, items, source:url?noteSource(url):input.shared?'Shared text':'Written here', shared:!!input.shared, createdAt:previous?.createdAt||now, createdOn:previous?.createdOn||input.createdOn||'web' };
}
