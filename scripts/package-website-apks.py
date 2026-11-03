"""Sign non-debuggable release APKs with the existing website identity. Never publish the keystore."""
from pathlib import Path
import os,subprocess,sys
root=Path(__file__).resolve().parent.parent
sdk=Path(os.environ.get('ANDROID_HOME',str(Path.home()/'AppData/Local/Android/Sdk')))
signer=sdk/'build-tools/36.0.0/apksigner.bat'
key=Path(os.environ.get('MANTRA_LEGACY_STORE',str(Path.home()/'.android/debug.keystore')))
out=Path(sys.argv[1]) if len(sys.argv)>1 else root/'.publish/website-apks'
out.mkdir(parents=True,exist_ok=True)
if not key.is_file():raise SystemExit('Restore the existing website signing key; do not generate a replacement.')
env={**os.environ,'MANTRA_LEGACY_KEY_PASS':os.environ.get('MANTRA_LEGACY_KEY_PASS','android')}
for edition in ['Local','Firebase']:
 flavor=edition.lower();source=root/f'APK/android/app/build/outputs/apk/{flavor}/release/app-{flavor}-release.apk';target=out/f'Maikal-{edition}.apk'
 subprocess.run([str(signer),'sign','--v4-signing-enabled','false','--ks',str(key),'--ks-key-alias','androiddebugkey','--ks-pass','env:MANTRA_LEGACY_KEY_PASS','--key-pass','env:MANTRA_LEGACY_KEY_PASS','--out',str(target),str(source)],env=env,check=True,capture_output=True)
 cert=subprocess.check_output([str(signer),'verify','--print-certs',str(target)],env=env,text=True)
 if 'f5494eb5787cc7354e24bd9769ddcacb902735dd62d6b366a2b20dc2512dd65e' not in cert:raise SystemExit('Website signing identity mismatch; do not distribute these APKs.')
 print('Prepared '+target.name+' with the existing website signing identity.')
