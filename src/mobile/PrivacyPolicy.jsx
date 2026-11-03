import {localOnly} from '../build-mode';
import {localPrivacy,firebasePrivacy} from '../privacy-policy-data';
export default function PrivacyPolicy(){return <section className="privacy-policy"><h2>MANTRA {localOnly?'Local':'Firebase'} privacy policy</h2>{(localOnly?localPrivacy:firebasePrivacy).map(([title,text])=><article key={title}><h3>{title}</h3><p>{text}</p></article>)}</section>}
