import {useEffect,useRef,useState} from 'react';
import {dayNote,noteForDay} from '../day-note-model';
export default function DayNote({records,date,save,notify}){
 const stored=noteForDay(records,date)?.text||'',[draft,setDraft]=useState(stored),[dirty,setDirty]=useState(false),[error,setError]=useState('');const focused=useRef(false);
 useEffect(()=>{if(!dirty&&!focused.current)setDraft(stored);},[stored,dirty]);
 function commit(){focused.current=false;if(!dirty)return;try{save(dayNote(date,draft));setDirty(false);setError('');}catch(e){setError(e.message||'Could not save your note.');notify('Your note could not be saved. Please try again.');}}
 return <section className="day-note-section" aria-label="Note of the day"><h2>Note of the day</h2><label className="sr-only" htmlFor="day-note-text">Write about your day</label><textarea id="day-note-text" maxLength={16000} rows={3} placeholder="A thought, a small win, a moment to remember…" value={draft} onFocus={()=>focused.current=true} onChange={e=>{setDraft(e.target.value);setDirty(true);}} onBlur={commit}/><div className="day-note-actions"><small role="status">{error|| (dirty?'Unsaved changes':'Saved for '+date)}</small><button type="button" onClick={commit} disabled={!dirty}>Save daily note</button></div></section>;
}
export function CalendarDayNote({records,date}){const note=noteForDay(records,date);return <section className="calendar-day-note"><h3>Note of the day</h3><p className="day-note-text">{note?.text?.trim()?note.text:'No note saved for this day.'}</p></section>}
