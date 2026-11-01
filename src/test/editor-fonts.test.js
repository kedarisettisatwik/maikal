import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import manifest from '../assets/editor-fonts/manifest.json';
import {EDITOR_FONTS,ensureEditorFonts,usedEditorFonts} from '../editor-fonts';
it('bundles every font with its exact source hash and redistribution licence',()=>{
 expect(EDITOR_FONTS).toHaveLength(42);expect(new Set(EDITOR_FONTS.map(f=>f.id)).size).toBe(42);
 for(const font of manifest){const bytes=readFileSync(`${process.cwd()}/src/assets/editor-fonts/${font.file}`);expect(bytes.length).toBe(font.bytes);expect(createHash('sha256').update(bytes).digest('hex')).toBe(font.sha256);expect(readFileSync(`${process.cwd()}/public/${font.license}`,'utf8')).toMatch(/OPEN FONT LICENSE|Apache License/);expect(font.source).toMatch(/^https:\/\/raw.githubusercontent.com\/google\/fonts\//);}
});
it('awaits both label and value font faces and surfaces an offline font load failure',async()=>{
 let release;const load=vi.fn(()=>new Promise(resolve=>release=resolve));vi.stubGlobal('FontFace',class{constructor(){this.load=load;}});Object.defineProperty(document,'fonts',{configurable:true,value:{add:vi.fn()}});
 const ids=usedEditorFonts({blocks:[{font:'caveat',valueFont:'outfit',visible:true},{font:'manrope',visible:false}]});expect(ids).toEqual(['caveat','outfit']);const loading=ensureEditorFonts(['caveat']);let settled=false;loading.then(()=>settled=true);await Promise.resolve();expect(settled).toBe(false);release();await loading;expect(settled).toBe(true);vi.unstubAllGlobals();
});
