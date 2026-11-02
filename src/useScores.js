import {useEffect} from 'react';
import {scoreSummary,scoreUpdates} from './score-model';
export default function useScores(records,save,date,uid,restoring,notify){useEffect(()=>{if(restoring)return;try{for(const update of scoreUpdates(records,date))save(update);}catch{notify('Could not save your score. Please check device storage.');}},[records,date,restoring]);return scoreSummary(records,date);}
