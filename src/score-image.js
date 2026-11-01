import { goalComplete } from './score-model';
import { progress } from './model';
export const IMAGE_WIDTH=1080, IMAGE_HEIGHT=1920;
export const IMAGE_FONTS={script:'cursive',classic:'Georgia, serif',clean:'sans-serif',mono:'monospace'};
export const defaultImageEffects=()=>({background:'#e8efe9',shape:'full',inset:0,radius:90,tint:'#14392d',tintOpacity:0,gradient:false,gradientStart:'#000000',gradientEnd:'#000000',startOpacity:0,endOpacity:75,gradientAngle:90,gradientOpacity:70,vignette:0,brightness:100,contrast:100,saturation:100,blur:0});
export const IMAGE_PRESETS={Natural:{},'Dark fade':{gradient:true,gradientOpacity:85,endOpacity:90,contrast:106},Warm:{tint:'#e69a48',tintOpacity:14,contrast:104,saturation:110},Cool:{tint:'#295b91',tintOpacity:18,contrast:105,saturation:90},Monochrome:{saturation:0,contrast:115,vignette:30}};
export function applyImagePreset(name){return {...defaultImageEffects(),...IMAGE_PRESETS[name]};}
export function defaultImageLayout(goalIds=[]){
 const block=(id,x,y,size)=>({id,x,y,size,color:'#ffffff',font:'script',backing:'shadow',visible:true});
 return {photo:{x:.5,y:.5,zoom:1},effects:defaultImageEffects(),blocks:[block('goals',.06,.07,100),block('score',.57,.12,120),block('overall',.06,.77,110),{...block('name',.06,.025,40),visible:false},{...block('date',.06,.9,34),font:'clean'},...goalIds.map((id,i)=>block(`goal:${id}`,i%2?.52:.06,.4+Math.floor(i/2)*.08,48))]};
}
export function scoreImageData(report,overall,records,name){
 const data={goals:{label:'Goals done',value:`${report.completed} / ${report.total}`},score:{label:'Yesterday’s score',value:String(report.points)},overall:{label:'Overall score',value:String(overall)},name:{text:name.trim()||'You'},date:{text:new Date(report.date+'T12:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}};
 for(const g of report.goals){const done=goalComplete(records,g,report.date),value=g.goalType==='tracker'?`${Number(progress(records,g,report.date))||0}${g.trackerUnit==='time'?' mins':''}`:done?'Done':'Not done';data[`goal:${g.id}`]={text:`${g.title}: ${value}${g.goalType==='tracker'?done?' ✓':' (target not met)':''}`};}return data;
}
const clamp=(v,low,high)=>Math.min(high,Math.max(low,v));
function wrap(ctx,text,width){const lines=[];let line='';for(const word of text.split(/\s+/)){if(line&&ctx.measureText(line+word).width>width){lines.push(line.trim());line='';}for(const char of word){if(line&&ctx.measureText(line+char).width>width){lines.push(line.trim());line='';}line+=char;}line+=' ';}if(line.trim())lines.push(line.trim());return lines.length?lines:[''];}
export function textBox(ctx,block,data){
 const family=IMAGE_FONTS[block.font]||IMAGE_FONTS.clean,max=IMAGE_WIDTH-64;let lines=[],height=0,scale=1;
 do {
  lines=[];const specs=data.text?[{text:data.text,size:block.size*scale}]:[{text:data.label,size:block.size*.48*scale},{text:data.value,size:block.size*scale}];
  for(const spec of specs){ctx.font=`600 ${spec.size}px ${family}`;for(const text of wrap(ctx,spec.text,max-32))lines.push({text,size:spec.size,width:ctx.measureText(text).width});}
  height=lines.reduce((h,l)=>h+l.size*1.35,0)+24;if(height<=IMAGE_HEIGHT-132)break;scale*=.9;
 }while(scale>.1);
 const width=Math.min(max,Math.max(40,...lines.map(l=>l.width))+32);
 return {id:block.id,x:clamp(block.x*IMAGE_WIDTH,16,IMAGE_WIDTH-width-16),y:clamp(block.y*IMAGE_HEIGHT,16,IMAGE_HEIGHT-height-100),width,height,lines,family};
}
export function photoGeometry(photo,t){const width=photo.naturalWidth||photo.width,height=photo.naturalHeight||photo.height,cover=Math.max(IMAGE_WIDTH/width,IMAGE_HEIGHT/height);return {width:width*cover*t.zoom,height:height*cover*t.zoom,minZoom:Math.min(IMAGE_WIDTH/width,IMAGE_HEIGHT/height)/cover,x:t.x*IMAGE_WIDTH,y:t.y*IMAGE_HEIGHT};}
export function movePhoto(photo,t,x,y){const g=photoGeometry(photo,t);return {...t,x:clamp(x,(40-g.width/2)/IMAGE_WIDTH,(IMAGE_WIDTH-40+g.width/2)/IMAGE_WIDTH),y:clamp(y,(40-g.height/2)/IMAGE_HEIGHT,(IMAGE_HEIGHT-40+g.height/2)/IMAGE_HEIGHT)};}
export function pinchPhoto(photo,start,anchor,current,ratio){const min=photoGeometry(photo,start).minZoom,zoom=clamp(start.zoom*ratio,min,4),actual=zoom/start.zoom;return movePhoto(photo,{...start,zoom},(current.x-(anchor.x-start.x*IMAGE_WIDTH)*actual)/IMAGE_WIDTH,(current.y-(anchor.y-start.y*IMAGE_HEIGHT)*actual)/IMAGE_HEIGHT);}
const rgba=(color,opacity)=>`rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},${opacity})`;
export function gradientCoordinates(angle){const radians=angle*Math.PI/180,dx=Math.cos(radians),dy=Math.sin(radians),length=Math.abs(IMAGE_WIDTH*dx)+Math.abs(IMAGE_HEIGHT*dy);return [IMAGE_WIDTH/2-dx*length/2,IMAGE_HEIGHT/2-dy*length/2,IMAGE_WIDTH/2+dx*length/2,IMAGE_HEIGHT/2+dy*length/2];}
function mask(ctx,e){
 const inset=e.inset,w=IMAGE_WIDTH-2*inset,h=IMAGE_HEIGHT-2*inset;ctx.beginPath();
 if(e.shape==='oval'||e.shape==='circle'){ctx.ellipse(IMAGE_WIDTH/2,IMAGE_HEIGHT/2,w/2,e.shape==='circle'?w/2:h/2,0,0,Math.PI*2);}
 else if(e.shape==='rounded'){const r=Math.min(e.radius,w/2,h/2);ctx.moveTo(inset+r,inset);ctx.lineTo(inset+w-r,inset);ctx.quadraticCurveTo(inset+w,inset,inset+w,inset+r);ctx.lineTo(inset+w,inset+h-r);ctx.quadraticCurveTo(inset+w,inset+h,inset+w-r,inset+h);ctx.lineTo(inset+r,inset+h);ctx.quadraticCurveTo(inset,inset+h,inset,inset+h-r);ctx.lineTo(inset,inset+r);ctx.quadraticCurveTo(inset,inset,inset+r,inset);ctx.closePath();}
 else ctx.rect(inset,inset,w,h);ctx.clip();
}
export function drawScoreImage(canvas,photo,layout,data){
 if(canvas.width!==IMAGE_WIDTH)canvas.width=IMAGE_WIDTH;if(canvas.height!==IMAGE_HEIGHT)canvas.height=IMAGE_HEIGHT;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image editing is unavailable on this device.');const effects={...defaultImageEffects(),...layout.effects};ctx.fillStyle=effects.background;ctx.fillRect(0,0,IMAGE_WIDTH,IMAGE_HEIGHT);ctx.save();mask(ctx,effects);
 if(photo){const p=photoGeometry(photo,layout.photo);ctx.filter=`brightness(${effects.brightness}%) contrast(${effects.contrast}%) saturate(${effects.saturation}%) blur(${effects.blur}px)`;ctx.drawImage(photo,p.x-p.width/2,p.y-p.height/2,p.width,p.height);ctx.filter='none';}
 if(effects.tintOpacity){ctx.fillStyle=rgba(effects.tint,effects.tintOpacity/100);ctx.fillRect(0,0,IMAGE_WIDTH,IMAGE_HEIGHT);}
 if(effects.gradient){const gradient=ctx.createLinearGradient(...gradientCoordinates(effects.gradientAngle));gradient.addColorStop(0,rgba(effects.gradientStart,effects.startOpacity/100*effects.gradientOpacity/100));gradient.addColorStop(1,rgba(effects.gradientEnd,effects.endOpacity/100*effects.gradientOpacity/100));ctx.fillStyle=gradient;ctx.fillRect(0,0,IMAGE_WIDTH,IMAGE_HEIGHT);}
 if(effects.vignette){ctx.save();ctx.translate(IMAGE_WIDTH/2,IMAGE_HEIGHT/2);ctx.scale(IMAGE_WIDTH/2,IMAGE_HEIGHT/2);const vignette=ctx.createRadialGradient(0,0,.25,0,0,1.25);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,`rgba(0,0,0,${effects.vignette/100})`);ctx.fillStyle=vignette;ctx.fillRect(-1,-1,2,2);ctx.restore();}ctx.restore();
 const boxes=[];
 for(const b of layout.blocks){if(!b.visible||!data[b.id])continue;const box=textBox(ctx,b,data[b.id]);boxes.push(box);ctx.save();const hex=b.color.slice(1),light=parseInt(hex.slice(0,2),16)*.299+parseInt(hex.slice(2,4),16)*.587+parseInt(hex.slice(4,6),16)*.114>140;
  if(b.backing==='panel'){ctx.fillStyle=light?'rgba(12,25,18,.66)':'rgba(255,255,255,.8)';ctx.fillRect(box.x,box.y,box.width,box.height);}if(b.backing==='shadow'){ctx.shadowColor=light?'rgba(0,0,0,.95)':'rgba(255,255,255,.95)';ctx.shadowBlur=7;ctx.shadowOffsetY=2;}
  ctx.fillStyle=b.color;ctx.textAlign='left';ctx.textBaseline='top';let y=box.y+12;for(const line of box.lines){ctx.font=`600 ${line.size}px ${box.family}`;ctx.fillText(line.text,box.x+16,y);y+=line.size*1.35;}ctx.restore();
 }
 ctx.save();ctx.font='600 30px sans-serif';ctx.textAlign='right';ctx.textBaseline='bottom';const watermark='done with mantra',width=ctx.measureText(watermark).width;ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(IMAGE_WIDTH-width-52,IMAGE_HEIGHT-76,width+32,54);ctx.fillStyle='#ffffff';ctx.fillText(watermark,IMAGE_WIDTH-36,IMAGE_HEIGHT-36);ctx.restore();return boxes;
}
