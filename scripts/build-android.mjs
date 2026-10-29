import {spawnSync} from 'node:child_process';
import {mkdirSync,cpSync,rmSync} from 'node:fs';
import path from 'node:path';
const root=process.cwd();
function run(executable,args){const r=spawnSync(executable,args,{stdio:'inherit',shell:false});if(r.status!==0)throw Error('Android build preparation failed');}
const vite=path.join(root,'node_modules/vite/bin/vite.js');
run(process.execPath,[vite,'build','--mode','android','--outDir','dist/android-firebase']);
run(process.execPath,[vite,'build','--mode','android-local','--outDir','dist/android-local']);
// Capacitor prepares plugin/config files in main; web bundles belong to their flavor.
// CLI uses the normal dist root; its index is needed during sync only.
cpSync('dist/android-firebase/index.html','dist/index.html');
run(process.execPath,[path.join(root,'node_modules/@capacitor/cli/bin/capacitor'),'sync','android']);
for(const flavor of ['local','firebase']){
 const target=path.resolve('APK/android/app/src',flavor,'assets/public');
 const allowed=path.resolve('APK/android/app/src')+path.sep;
 if(!target.startsWith(allowed))throw Error('Invalid flavor output path');
 rmSync(target,{recursive:true,force:true});mkdirSync(target,{recursive:true});
 cpSync('dist/android-'+flavor,target,{recursive:true});
}
const generated=path.resolve('APK/android/app/src/main/assets/public');
if(!generated.startsWith(path.resolve('APK/android/app/src/main/assets')+path.sep))throw Error('Invalid generated asset path');
rmSync(generated,{recursive:true,force:true});
console.log('Prepared isolated local and Firebase Android assets.');
