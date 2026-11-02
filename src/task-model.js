import {localDate,progress} from './model';
export const validDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(new Date(s+'T12:00:00').getTime())&&new Date(s+'T12:00:00').toISOString().slice(0,10)===s;
export function prepareTask(record,old){
 if(!record.title?.trim())throw Error('Enter a task title.');
 if(!validDay(record.startDate))throw Error('Choose a start date.');
 if(record.deadline&&(!validDay(record.deadline)||record.deadline<record.startDate))throw Error('Deadline must be on or after the start date.');
 return {...record,title:record.title.trim(),createdDate:old?.createdDate||localDate(),originalDeadline:old?.originalDeadline??old?.deadline??record.deadline??'',deadlineChanged:!!old?.deadlineChanged||!!old&&(old.deadline||'')!==(record.deadline||''),completed:!!old?.completed,completedAt:old?.completedAt||null,completedDate:old?.completedDate||''};
}
export function taskDone(task,now=Date.now(),complete=true){return {...task,completed:complete,completedAt:complete?now:null,completedDate:complete?localDate(new Date(now)):""};}
export const taskEligible=(task,day)=>!task.deleted&&!task.deadlineChanged&&!!task.deadline&&task.deadline===day;
export const taskCompleteBy=(task,day)=>!!task.completed&&!!task.completedAt&&(task.completedDate||localDate(new Date(task.completedAt)))<=day;
export function taskMinutes(records,task){return Math.max(0,(Number(task.timeAdjustment)||0)+Object.values(records).filter(p=>p.type==='progress'&&p.goalId===task.id&&!p.deleted).reduce((n,p)=>n+(Number(p.value)||0),0));}
export function screenGoal(config,old,day=localDate()){
 return {...old,id:config.goalId||old?.id||'managed_screen_time',type:'goal',title:'Screen time',goalType:'tracker',trackerUnit:'time',target:config.targetMinutes,targetRule:'atMost',managedBy:'screenTime',focusEnabled:false,deleted:!config.enabled,schedule:{type:'everyday'},createdDate:old?.createdDate||day,notificationTimes:old?.notificationTimes||[],alarmTimes:old?.alarmTimes||[],iconMode:'emoji',icon:'📱'};
}
