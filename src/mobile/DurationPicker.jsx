import {useEffect,useRef} from 'react';
const ROW=40;
function Wheel({name,value,max,onChange,disabled}){
 const ref=useRef(null),timer=useRef(null),changing=useRef(false);
 useEffect(()=>{if(ref.current&&Math.abs(ref.current.scrollTop-value*ROW)>1){changing.current=true;ref.current.scrollTop=value*ROW;requestAnimationFrame(()=>{changing.current=false})}},[value]);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 function scroll(){if(changing.current||disabled)return;clearTimeout(timer.current);timer.current=setTimeout(()=>onChange(Math.max(0,Math.min(max,Math.round(ref.current.scrollTop/ROW)))),140)}
 function key(e){const next=e.key==='ArrowUp'?value-1:e.key==='ArrowDown'?value+1:e.key==='Home'?0:e.key==='End'?max:null;if(next!==null){e.preventDefault();if(!disabled)onChange(Math.max(0,Math.min(max,next)))}}
 return <div className="duration-column"><div className="duration-label">{name}</div><div ref={ref} className="duration-wheel" role="spinbutton" aria-label={'Timer '+name.toLowerCase()} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-disabled={disabled} tabIndex={disabled?-1:0} onKeyDown={key} onScroll={scroll}>{Array.from({length:max+1},(_,n)=><div className={n===value?'duration-value active':'duration-value'} key={n} aria-hidden="true" onClick={()=>{if(!disabled)onChange(n)}}>{String(n).padStart(2,'0')}</div>)}</div></div>
}
export default function DurationPicker({value,onChange,disabled}){return <div className="duration-picker" role="group" aria-label="Timer duration"><div className="duration-highlight" aria-hidden="true"/>{['hours','minutes','seconds'].map(name=><Wheel key={name} name={name[0].toUpperCase()+name.slice(1)} value={Number(value[name])} max={name==='hours'?24:59} disabled={disabled} onChange={n=>onChange({...value,[name]:n})}/>)}</div>}
