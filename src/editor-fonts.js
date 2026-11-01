import manifest from './assets/editor-fonts/manifest.json';
const urls=import.meta.glob('./assets/editor-fonts/*.ttf',{eager:true,query:'?url',import:'default'});
const system=[{id:'script',name:'System Script',category:'Script',family:'cursive'},{id:'classic',name:'System Serif',category:'Serif',family:'Georgia, serif'},{id:'clean',name:'System Sans',category:'Sans',family:'sans-serif'},{id:'mono',name:'System Mono',category:'Mono',family:'monospace'}];
export const EDITOR_FONTS=[...system,...manifest.map(font=>({...font,url:urls[`./assets/editor-fonts/${font.file}`]}))];
export const IMAGE_FONTS=Object.fromEntries(EDITOR_FONTS.map(font=>[font.id,font.url?`"${font.family}", ${font.category==='Script'?'cursive':font.category==='Mono'?'monospace':font.category==='Serif'?'serif':'sans-serif'}`:font.family]));
const faces=new Map();
export function registerEditorFonts(){
 if(typeof FontFace==='undefined'||!globalThis.document?.fonts)return;
 for(const font of EDITOR_FONTS){if(!font.url||faces.has(font.id))continue;const face=new FontFace(font.family,`url("${font.url}")`,{style:'normal',weight:font.weight,display:'swap'});document.fonts.add(face);faces.set(font.id,face);}
}
export async function ensureEditorFonts(ids){
 registerEditorFonts();await Promise.all([...new Set(ids)].map(id=>{const font=EDITOR_FONTS.find(f=>f.id===id);if(!font?.url)return null;const face=faces.get(id);if(!face)throw Error('This WebView cannot load bundled fonts. Choose a system font.');return face.load();}));
}
export function usedEditorFonts(layout){return layout.blocks.filter(b=>b.visible).flatMap(b=>[b.font,b.valueFont||b.font]);}
