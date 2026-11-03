import {validDay} from './task-model';
export const dayNoteId=date=>`daynote_${date}`;
export function noteForDay(records,date){const record=records[dayNoteId(date)];return record?.type==='dayNote'&&!record.deleted&&record.date===date?record:null;}
export function dayNote(date,text){if(!validDay(date))throw Error('Choose a valid date.');if(typeof text!=='string'||text.length>16000)throw Error('Keep your daily note under 16,000 characters.');return {id:dayNoteId(date),type:'dayNote',date,text};}
