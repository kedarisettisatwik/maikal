"""Bundle unmodified, OFL-licensed Google Fonts for the offline score editor."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib, json, re, urllib.request

FAMILIES = {
 'Script': ['Caveat','Dancing Script','Great Vibes','Pacifico','Satisfy','Allura','Alex Brush','Kaushan Script','Courgette','Parisienne','Sacramento','Yellowtail','Kalam','Permanent Marker'],
 'Sans': ['Outfit','Manrope','DM Sans','Montserrat','Poppins','Nunito','Quicksand','Raleway'],
 'Serif': ['Playfair Display','Cormorant Garamond','Libre Baskerville','Lora','Merriweather','Bodoni Moda','Crimson Pro'],
 'Display': ['Bebas Neue','Anton','Abril Fatface','Righteous','Cinzel'],
 'Mono': ['Space Mono','IBM Plex Mono','JetBrains Mono','Roboto Mono'],
}
ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'src/assets/editor-fonts'
LEGAL = ROOT / 'public/font-licenses'
BASE = 'https://raw.githubusercontent.com/google/fonts/main/ofl/'
def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'MANTRA-font-bundler'}), timeout=45) as r: return r.read()
def one(item):
    category, name = item
    slug = re.sub('[^a-z0-9]','',name.lower())
    base=BASE
    try: metadata=fetch(base+slug+'/METADATA.pb').decode()
    except urllib.error.HTTPError as error:
        if error.code!=404: raise
        base=BASE.replace('/ofl/','/apache/')
        metadata=fetch(base+slug+'/METADATA.pb').decode()
    license_name='OFL.txt' if '/ofl/' in base else 'LICENSE.txt'
    license_bytes=fetch(base+slug+'/'+license_name)
    if b'OPEN FONT LICENSE' not in license_bytes.upper() and b'Apache License' not in license_bytes: raise ValueError(f'{name}: missing redistribution licence')
    files = re.findall(r'fonts\s*\{(.*?)\n\}', metadata, re.S)
    normal = [b for b in files if 'style: "normal"' in b and 'weight: 400' in b]
    if not normal: raise ValueError(f'{name}: regular font missing')
    filename = re.search(r'filename: "([^"]+)"',normal[0]).group(1)
    url = base+slug+'/'+urllib.parse.quote(filename)
    target = DEST/(slug+'.ttf')
    data = fetch(url)
    if data[:4] not in [b'\x00\x01\x00\x00',b'OTTO',b'ttcf']: raise ValueError(f'{name}: invalid font data')
    target.write_bytes(data)
    directory = LEGAL/slug;directory.mkdir(parents=True,exist_ok=True)
    (directory/license_name).write_bytes(license_bytes)
    axes = re.findall(r'axes\s*\{(.*?)\n\}',metadata,re.S)
    weight='400'
    for axis in axes:
        if 'tag: "wght"' in axis:
            bounds=re.findall(r'(?:min|max)_value:\s*([0-9.]+)',axis)
            if len(bounds)==2: weight=' '.join(str(int(float(v))) for v in bounds)
    return {'id':slug,'name':name,'category':category,'file':target.name,'family':'MANTRA '+name,'weight':weight,'source':url,'license':'font-licenses/'+slug+'/'+license_name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)}
def main():
    DEST.mkdir(parents=True,exist_ok=True);LEGAL.mkdir(parents=True,exist_ok=True)
    items=[(group,name) for group,names in FAMILIES.items() for name in names]
    with ThreadPoolExecutor(max_workers=6) as pool: result=list(pool.map(one,items))
    (DEST/'manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (LEGAL/'README.txt').write_text('MANTRA report editor fonts\nUnmodified Google Fonts files, distributed under each included SIL Open Font License or Apache License.\nSource: https://github.com/google/fonts\n\n'+'\n'.join(f'{f["name"]}: {f["source"]}' for f in result)+'\n',encoding='utf-8')
    print(json.dumps({'fonts':len(result),'megabytes':round(sum(f['bytes'] for f in result)/1048576,2)}))
if __name__=='__main__':main()
