import ScoreImageEffects from './ScoreImageEffects';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registerPlugin } from '@capacitor/core';
import { goalComplete } from '../score-model';
import { isNative } from '../native-notifications';
import { defaultImageLayout, drawScoreImage, IMAGE_FONTS, IMAGE_HEIGHT, IMAGE_WIDTH, movePhoto, photoGeometry, pinchPhoto, scoreImageData } from '../score-image';
import '../score.css';

export function ScoreTotals({ score }) { return <div className="score-totals" aria-label="Your scores"><div><span>Today’s score</span><strong>{score.today.points}</strong></div><div><span>Overall score</span><strong>{score.overall}</strong></div></div>; }
const labels = { photo: 'Photo', goals: 'Goals done', score: 'Yesterday’s score', overall: 'Overall score', name: 'Your name', date: 'Report date' };
export default function ScoreCard({ user, score, onBack, notify, records = {}, embedded = false }) {
  const report = score.yesterday, date = report.date;
  const [name,setName] = useState(() => { try { return localStorage.getItem(`mantra-score-name-${user.uid}`) || user.displayName || (user.email?.includes('@') ? user.email.split('@')[0] : 'You'); } catch { return 'You'; } });
  const [chosen,setChosen] = useState(false), [photo,setPhoto] = useState(null), [loading,setLoading] = useState(false), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const [layout,setLayout] = useState(defaultImageLayout), [selected,setSelected] = useState('photo');
  const canvas = useRef(null), stage = useRef(null), input = useRef(null), model = useRef(layout), boxes = useRef([]), pointers = useRef(new Map()), gesture = useRef(null), frame = useRef(0), request = useRef(0), alive = useRef(true);
  const data = useMemo(() => scoreImageData(report,score.throughYesterday,records,name),[report,score.throughYesterday,records,name]);
  const drawState = useRef(); drawState.current = { photo,data };
  const [selectionBox,setSelectionBox] = useState(null);
  const paint = useCallback(() => {
    if (!canvas.current) return;
    try { boxes.current = drawScoreImage(canvas.current,drawState.current.photo,model.current,drawState.current.data); setSelectionBox(boxes.current.find(b => b.id === selected) || null); }
    catch(e) { setError(e.message); }
  },[selected]);
  const redraw = useCallback(() => { cancelAnimationFrame(frame.current); frame.current = requestAnimationFrame(paint); },[paint]);
  function commit(next, live = false) { model.current = next; if (!live) setLayout(next); redraw(); }
  useEffect(() => { if (chosen) redraw(); },[chosen,photo,data,layout,redraw]);
  useEffect(() => { alive.current=true;return () => { alive.current=false;request.current++;cancelAnimationFrame(frame.current); }; },[]);
  async function choosePhoto(event) {
    const file = event.target.files?.[0]; if (!file) return;
    const token = ++request.current; setError('');
    if (!file.type.startsWith('image/') || file.size > 15*1024*1024) { setError('Choose an image smaller than 15 MB.'); event.target.value = ''; setLoading(false); return; }
    setLoading(true); const url = URL.createObjectURL(file), image = new Image();
    try {
      image.src=url; await image.decode(); if (token!==request.current || !alive.current) return;
      const scale=Math.min(1,3072/Math.max(image.naturalWidth,image.naturalHeight));
      const reduced=document.createElement('canvas'); reduced.width=Math.max(1,Math.round(image.naturalWidth*scale)); reduced.height=Math.max(1,Math.round(image.naturalHeight*scale)); reduced.getContext('2d').drawImage(image,0,0,reduced.width,reduced.height);
      setPhoto(reduced); setChosen(true); setSelected('photo'); commit({...model.current,photo:{x:.5,y:.5,zoom:1}});
    } catch { if(token===request.current)setError('Could not open this image. Try a JPG or PNG photo.'); }
    finally { URL.revokeObjectURL(url); event.target.value=''; if(token===request.current&&alive.current)setLoading(false); }
  }
  function point(e) { const r=stage.current.getBoundingClientRect(); return {x:(e.clientX-r.left)/r.width*IMAGE_WIDTH,y:(e.clientY-r.top)/r.height*IMAGE_HEIGHT}; }
  function down(e) {
    if(e.button!=null&&e.button!==0)return;
    e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); const p=point(e); pointers.current.set(e.pointerId,p);
    const points=[...pointers.current.values()];
    if(points.length===2&&photo){const [a,b]=points;gesture.current={type:'pinch',start:{...model.current.photo},anchor:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};setSelected('photo');return;}
    if(points.length!==1)return;
    const hit=[...boxes.current].reverse().find(b=>p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height);
    if(hit){setSelected(hit.id);gesture.current={type:'text',id:hit.id,offset:{x:p.x-hit.x,y:p.y-hit.y}};}
    else {setSelected('photo');gesture.current={type:'photo',start:{...model.current.photo},anchor:p};}
  }
  function move(e) {
    if(!pointers.current.has(e.pointerId))return;
    const p=point(e);pointers.current.set(e.pointerId,p);const g=gesture.current;if(!g)return;
    if(g.type==='pinch'&&photo&&pointers.current.size>=2){const [a,b]=[...pointers.current.values()];commit({...model.current,photo:pinchPhoto(photo,g.start,g.anchor,{x:(a.x+b.x)/2,y:(a.y+b.y)/2},Math.hypot(a.x-b.x,a.y-b.y)/g.distance)},true);}
    else if(g.type==='photo'&&photo)commit({...model.current,photo:movePhoto(photo,g.start,g.start.x+(p.x-g.anchor.x)/IMAGE_WIDTH,g.start.y+(p.y-g.anchor.y)/IMAGE_HEIGHT)},true);
    else if(g.type==='text')commit({...model.current,blocks:model.current.blocks.map(b=>b.id===g.id?{...b,x:(p.x-g.offset.x)/IMAGE_WIDTH,y:(p.y-g.offset.y)/IMAGE_HEIGHT}:b)},true);
  }
  function up(e) {
    pointers.current.delete(e.pointerId);if(e.currentTarget.hasPointerCapture?.(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
    setLayout({...model.current});gesture.current=null;
    if(pointers.current.size===1&&photo){const p=[...pointers.current.values()][0];gesture.current={type:'photo',start:{...model.current.photo},anchor:p};}
  }
  function editBlock(patch) { commit({...model.current,blocks:model.current.blocks.map(b=>b.id===selected?{...b,...patch}:b)}); }
  function toggle(id,on) { const found=model.current.blocks.some(b=>b.id===id),block={...defaultImageLayout([id.replace('goal:','')]).blocks.at(-1),id};commit({...model.current,blocks:found?model.current.blocks.map(b=>b.id===id?{...b,visible:on}:b):[...model.current.blocks,{...block,visible:on,y:Math.min(.75,.52+model.current.blocks.filter(b=>b.id.startsWith('goal:')&&b.visible).length*.08)}]});if(on)setSelected(id);else if(selected===id)setSelected('photo'); }
  function reset() { const ids=model.current.blocks.filter(b=>b.id.startsWith('goal:')&&b.visible).map(b=>b.id.slice(5));commit({...defaultImageLayout(ids),effects:model.current.effects});setSelected(photo?'photo':'score'); }
  async function download() {
    if(!canvas.current||busy)return;setBusy(true);setError('');
    try { drawScoreImage(canvas.current,photo,model.current,data);const image=canvas.current.toDataURL('image/png');
      if(isNative()){const result=await registerPlugin('DiaryAlarms').saveScoreCard({image,filename:`MANTRA-report-${date}.png`});if(!result.cancelled)notify('Yesterday’s report saved');}
      else {const a=document.createElement('a');a.href=image;a.download=`MANTRA-report-${date}.png`;a.click();}
    }catch(e){setError(e.message||'Could not download this image.');}finally{if(alive.current)setBusy(false);}
  }
  const block=layout.blocks.find(b=>b.id===selected), zoomMinimum=photo?photoGeometry(photo,layout.photo).minZoom:1;
  const title=id=>labels[id]||report.goals.find(g=>`goal:${g.id}`===id)?.title||'Goal';
  return <section className="score-page photo-score-page">{!embedded&&<button className="score-back" onClick={onBack}>← Back</button>}<h1>Yesterday’s report</h1><p className="score-report-date">{data.date.text} · {report.completed}/{report.total} goals met · {report.points} points</p>
    <input ref={input} hidden type="file" accept="image/*" onChange={choosePhoto} aria-label="Photo of the day"/>
    {!chosen?<div className="score-photo-choice"><h2>Your photo, your progress.</h2><p>Choose a photo as the background, then arrange yesterday’s results over it. Photos stay on this device.</p><div className="score-actions"><button className="primary" disabled={loading} onClick={()=>input.current.click()}>{loading?'Opening photo…':'Choose photo'}</button><button disabled={loading} onClick={()=>{request.current++;setChosen(true);setSelected('score');}}>Skip</button></div></div>:<>
      <div className="score-actions editor-actions"><button disabled={loading} onClick={()=>input.current.click()}>{loading?'Opening photo…':'Choose photo'}</button>{photo&&<button onClick={()=>{request.current++;setPhoto(null);setLoading(false);setSelected('score');}}>Remove photo</button>}<button onClick={reset}>Reset layout</button><button className="primary" disabled={busy||loading} onClick={download}>{busy?'Saving…':'Download score card'}</button></div>
      <p className="score-editor-help">Drag text to position it. Drag the photo to move it, or pinch with two fingers to zoom. Export: 1080 × 1920.</p>
      <div ref={stage} className="score-canvas-stage" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={e=>{if(pointers.current.has(e.pointerId))up(e);}}>
        <canvas ref={canvas} data-score-canvas width={IMAGE_WIDTH} height={IMAGE_HEIGHT} role="img" aria-label={`Editable yesterday report: ${report.points} points, ${report.completed} of ${report.total} goals, ${score.throughYesterday} overall`}/>
        {selected!=='photo'&&selectionBox&&<div className="score-selection" aria-hidden="true" style={{left:`${selectionBox.x/IMAGE_WIDTH*100}%`,top:`${selectionBox.y/IMAGE_HEIGHT*100}%`,width:`${selectionBox.width/IMAGE_WIDTH*100}%`,height:`${selectionBox.height/IMAGE_HEIGHT*100}%`}}/>}
      </div>
      <div className="score-editor-controls"><label className="field"><span>Edit element</span><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="photo">Photo</option>{layout.blocks.filter(b=>b.visible&&data[b.id]).map(b=><option key={b.id} value={b.id}>{title(b.id)}</option>)}</select></label>
      {selected==='photo'?photo?<><label className="field"><span>Photo zoom</span><input type="range" min={zoomMinimum} max="4" step="0.01" value={layout.photo.zoom} onChange={e=>commit({...model.current,photo:{...model.current.photo,zoom:Number(e.target.value)}})}/></label><div className="score-actions"><button onClick={()=>commit({...model.current,photo:{x:.5,y:.5,zoom:zoomMinimum}})}>Fit photo</button><button onClick={()=>commit({...model.current,photo:{x:.5,y:.5,zoom:1}})}>Fill frame</button></div></>:<p className="small">Choose a photo to resize or move it.</p>:block&&<><div className="score-control-row"><label className="field"><span>Font</span><select value={block.font} onChange={e=>editBlock({font:e.target.value})}>{Object.keys(IMAGE_FONTS).map(f=><option key={f} value={f}>{({script:'Script',classic:'Classic',clean:'Clean',mono:'Monospace'})[f]}</option>)}</select></label><label className="field"><span>Text colour</span><input type="color" value={block.color} onChange={e=>editBlock({color:e.target.value})}/></label></div><label className="field"><span>Text size</span><input type="range" min="24" max="160" step="2" value={block.size} onChange={e=>editBlock({size:Number(e.target.value)})}/></label><label className="field"><span>Readability</span><select value={block.backing} onChange={e=>editBlock({backing:e.target.value})}><option value="none">Plain text</option><option value="shadow">Text shadow</option><option value="panel">Translucent background</option></select></label><div className="score-control-row"><label className="field"><span>Horizontal position</span><input type="range" min="0" max="95" value={Math.max(0,Math.min(95,block.x*100))} onChange={e=>editBlock({x:Number(e.target.value)/100})}/></label><label className="field"><span>Vertical position</span><input type="range" min="0" max="90" value={Math.max(0,Math.min(90,block.y*100))} onChange={e=>editBlock({y:Number(e.target.value)/100})}/></label></div></>}
      {selected==='photo'&&<ScoreImageEffects value={layout.effects} onChange={effects=>commit({...model.current,effects})}/>}
      <fieldset className="score-overlay-options"><legend>Show on image</legend>{['score','goals','overall','name','date'].map(id=><label key={id}><input type="checkbox" checked={Boolean(layout.blocks.find(b=>b.id===id)?.visible)} onChange={e=>toggle(id,e.target.checked)}/>{title(id)}</label>)}</fieldset>
      <label className="field"><span>Your name</span><input value={name} maxLength={60} onChange={e=>{setName(e.target.value);try{localStorage.setItem(`mantra-score-name-${user.uid}`,e.target.value);}catch{}}}/></label>
      <fieldset className="score-overlay-options"><legend>Add particular goals</legend>{report.goals.map(g=><label key={g.id}><input type="checkbox" checked={Boolean(layout.blocks.find(b=>b.id===`goal:${g.id}`)?.visible)} onChange={e=>toggle(`goal:${g.id}`,e.target.checked)}/><span>{g.title}<small>{goalComplete(records,g,date)?'Met':'Not met'}</small></span></label>)}{!report.goals.length&&<p>No goals were scheduled yesterday.</p>}</fieldset></div>
    </>}
    {error&&<p role="alert" className="error">{error}</p>}
    <details className="report-goal-details"><summary>Yesterday’s goals</summary><ul className="report-goals">{report.goals.map(g=><li key={g.id}><strong>{g.title}</strong><span>{goalComplete(records,g,date)?'Met':'Not met'}{g.goalType==='tracker'?g.target!=null?` · ${g.targetRule==='atMost'?'At most':'At least'} ${g.target}`:' · No scoring target':''}</span></li>)}</ul></details>
    <p className="score-rules">10 points per completed goal. All scheduled goals complete: 1.2× daily bonus. This image uses yesterday’s results and the overall score through yesterday. Only yesterday’s card is available here.</p>
  </section>;
}
