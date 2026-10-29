// Build-time replacement: the local APK contains no Firebase SDK or configuration.
export const auth = null, db = null, app = null;
export const authReady = Promise.resolve();
export const onAuthStateChanged = (_auth, callback) => { queueMicrotask(() => callback(null)); return () => {}; };
const unavailable = () => { throw new Error('Cloud services are not included in Maikal Local.'); };
export const signInWithEmailAndPassword = unavailable, signOut = unavailable;
export const createUserWithEmailAndPassword = unavailable, sendPasswordResetEmail = unavailable, validatePassword = unavailable;
export const collection = unavailable, doc = unavailable, query = unavailable, where = unavailable;
export const onSnapshot = unavailable, setDoc = unavailable, runTransaction = unavailable, writeBatch = unavailable;
