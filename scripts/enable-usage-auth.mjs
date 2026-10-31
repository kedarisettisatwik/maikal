import {cert} from 'firebase-admin/app';
const key=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT||'null');
if(!key?.private_key||key.project_id!==process.env.FIREBASE_PROJECT_ID)throw Error('Matching service account required');
const {access_token}=await cert(key).getAccessToken();
const response=await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${key.project_id}/config?updateMask=signIn.anonymous.enabled`,{method:'PATCH',headers:{Authorization:`Bearer ${access_token}`,'Content-Type':'application/json'},body:JSON.stringify({signIn:{anonymous:{enabled:true}}})});
if(!response.ok)throw Error(`Anonymous usage sign-in setup failed: HTTP ${response.status}`);
console.log('Anonymous usage sign-in enabled. Existing email/password sign-in is unchanged.');
