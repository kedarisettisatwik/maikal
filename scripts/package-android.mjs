import {spawnSync} from 'node:child_process';
import {cpSync,existsSync,readdirSync} from 'node:fs';
import path from 'node:path';
function check(result){if(result.status!==0)throw Error(result.error?.message||'Android build failed.');}
check(spawnSync(process.execPath,['scripts/build-android.mjs'],{stdio:'inherit'}));
const env={...process.env};
const bundled=path.resolve('.publish/android-tools/jdk21');
if(!env.JAVA_HOME&&existsSync(bundled)){const folder=readdirSync(bundled).find(n=>n.startsWith('jdk-'));if(folder)env.JAVA_HOME=path.join(bundled,folder);}
const pathKey=Object.keys(env).find(k=>k.toLowerCase()==='path')||'PATH';
if(env.JAVA_HOME)env[pathKey]=path.join(env.JAVA_HOME,'bin')+path.delimiter+(env[pathKey]||'');
const windows=process.platform==='win32';
check(spawnSync(windows?(process.env.ComSpec||'C:/Windows/System32/cmd.exe'):'./gradlew',windows?['/d','/c','gradlew.bat','assembleLocalDebug','assembleFirebaseDebug','--console=plain']:['assembleLocalDebug','assembleFirebaseDebug','--console=plain'],{cwd:'APK/android',env,stdio:'inherit'}));
for(const [flavor,name]of[['local','Local'],['firebase','Firebase']])cpSync(`APK/android/app/build/outputs/apk/${flavor}/debug/app-${flavor}-debug.apk`,`APK/Maikal-${name}.apk`);
console.log('Created APK/Maikal-Local.apk and APK/Maikal-Firebase.apk');
