import { useEffect, useRef, useState } from 'react';
import { describe, progress, unit } from '../model';
import { Icon } from './EntryDialog';

function Tracker({ goal, date, value, onSave, notify }) {
  const [draft, setDraft] = useState(String(Number(value) || 0));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(String(Number(value) || 0)); }, [value, date]);
  function save() {
    focused.current = false;
    const number = Number(draft);
    if (!draft.trim() || !Number.isFinite(number) || number < 0 || number > 1e9) { setDraft(String(Number(value) || 0)); notify('Enter a value from 0 to 1,000,000,000.'); return; }
    if (number !== Number(value)) onSave(goal.id, number, date);
  }
  return <div className="tracker"><input type="number" min="0" max="1000000000" step="any" aria-label={`${goal.title} ${unit(goal)}`} value={draft} onChange={e => setDraft(e.target.value)} onFocus={() => focused.current = true} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} /></div>;
}
export default function GoalBoard({ goals, todayGoals, records, date, onProgress, remove, notify }) {
  return <><div>{todayGoals.length ? todayGoals.map(goal => { const value = progress(records, goal, date), tracker = goal.goalType === 'tracker'; return <div className={`item ${!tracker && value ? 'done' : ''}`} key={goal.id}>{!tracker && <input type="checkbox" checked={Boolean(value)} onChange={e => onProgress(goal.id, e.target.checked, date)} aria-label={`Mark ${goal.title} done`} />}<Icon record={goal} /><div className="body"><h3>{goal.title}</h3><small>{tracker ? `Track in ${unit(goal)}` : value ? 'Completed today' : 'One step for today'}</small></div>{tracker && <Tracker key={`${goal.id}-${date}`} goal={goal} date={date} value={value} onSave={onProgress} notify={notify} />}</div>; }) : <p className="empty">A fresh page. Add a goal to begin.</p>}</div>
    <details style={{ marginTop: 18 }}><summary>All saved goals</summary>{goals.length ? goals.map(g => <div className="item" key={g.id}><Icon record={g} /><div className="body"><h3 className="saved-title">{g.title}</h3><small>{describe(g.schedule)} · {g.goalType === 'tracker' ? `Tracker / ${unit(g)}` : 'Checkbox'}</small></div><button className="mini" onClick={() => remove(g.id)}>Delete</button></div>) : <p className="empty">No goals created yet.</p>}</details>
  </>;
}
