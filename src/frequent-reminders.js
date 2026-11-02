export function validateFrequentReminders(value){
 if(!value?.enabled)return null;
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.start)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.end))throw Error('Choose start and end times for frequent reminders.');
 const minutes=Number(value.intervalMinutes);if(!Number.isInteger(minutes)||minutes<1||minutes>1440)throw Error('Choose a frequency from 1 minute to 24 hours.');
 return {enabled:true,start:value.start,end:value.end,intervalMinutes:minutes};
}
