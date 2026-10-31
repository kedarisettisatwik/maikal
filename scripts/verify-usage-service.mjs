import {initializeApp,cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
const credential=cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));const app=initializeApp({credential});
const project=process.env.FIREBASE_PROJECT_ID,key=process.env.FIREBASE_API_KEY;let uid;
const base=`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
async function check(response){if(!response.ok)throw Error(`Usage verification HTTP ${response.status}`);return response.json();}
try{
 const identity=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"returnSecureToken":true}'}).then(check);uid=identity.localId;
 const fields={edition:{stringValue:'local'},version:{stringValue:'verification'},firstSeen:{stringValue:new Date().toISOString()}};for(const n of ['goals','reminders','meetings','notifications','alarms','expenses','notes'])fields[n]={integerValue:'0'};
 const update={name:`projects/${project}/databases/(default)/documents/appUsage/${uid}`,fields};
 const write=()=>fetch(`${base}:commit`,{method:'POST',headers:{Authorization:`Bearer ${identity.idToken}`,'Content-Type':'application/json'},body:JSON.stringify({writes:[{update,updateTransforms:[{fieldPath:'updatedAt',setToServerValue:'REQUEST_TIME'}]}]})});
 await write().then(check);
 for(const headers of [{},{Authorization:`Bearer ${identity.idToken}`}]){const r=await fetch(`${base}/appUsage/${uid}`,{headers});if(r.status!==403)throw Error('Usage data read was not restricted');}
 fields.title={stringValue:'must-be-rejected'};if((await write()).status!==403)throw Error('Private content was not rejected');
 const token=await getAuth(app).createCustomToken('0kX2kfDq3KV9MIhtDV7IDpuXnfJ3');const owner=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${key}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,returnSecureToken:true})}).then(check);
 await fetch(`${base}/appUsage/${uid}`,{headers:{Authorization:`Bearer ${owner.idToken}`}}).then(check);
 console.log('Usage verification passed: aggregate write accepted, anonymous/public reads denied, private fields rejected, owner read accepted.');
}finally{if(uid){const {access_token}=await credential.getAccessToken();const r=await fetch(`${base}/appUsage/${uid}`,{method:'DELETE',headers:{Authorization:`Bearer ${access_token}`}});if(!r.ok)throw Error('Could not remove verification record');await getAuth(app).deleteUser(uid);}}
