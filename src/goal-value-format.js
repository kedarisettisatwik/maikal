export function goalValueText(goal,value){const number=Number(value)||0;return goal.trackerUnit==='time'?number.toFixed(2):String(number);}
