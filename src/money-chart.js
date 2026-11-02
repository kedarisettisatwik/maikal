export const REMAINING_COLOR='#25985b';
const PALETTE=['#ef7c25','#536de0','#bb4ab5','#e34d61','#1b9cbc','#9560d5','#ce9a18','#e86aab','#3764a4','#bf5831','#7755a4','#23a6a4','#c14c7d','#6982b8','#d27431','#935b89'];
export function moneyChart(transactions,records={}){
 const totals=new Map();let income=0,expense=0;
 for(const tx of transactions){if(tx.deleted||!Number.isFinite(tx.amount)||tx.amount<=0)continue;if(tx.kind==='income')income+=tx.amount;else if(tx.kind==='expense'){expense+=tx.amount;const id=tx.categoryId||'uncategorized';totals.set(id,(totals.get(id)||0)+tx.amount);}}
 const ids=[...new Set([...Object.values(records).filter(r=>r.type==='category'&&r.kind==='expense'&&!r.deleted).map(r=>r.id),...totals.keys()])].sort();
 const color=id=>{const i=ids.indexOf(id);if(i<PALETTE.length)return PALETTE[i];let hue=((i-PALETTE.length)*137.507764+23)%285;if(hue>=90)hue+=75;return `hsl(${hue.toFixed(4)} 70% 48%)`;};
 const base=Math.max(income,expense),remaining=Math.max(0,income-expense),deficit=Math.max(0,expense-income);
 const slices=[...(remaining?[{id:'remaining',kind:'remaining',amount:remaining,color:REMAINING_COLOR}]:[]),...[...totals].sort((a,b)=>b[1]-a[1]).map(([id,amount])=>({id,kind:'expense',amount,color:color(id)}))].map(s=>({...s,percent:base?s.amount/base*100:0}));
 let cursor=0;const stops=slices.map((s,i)=>{const start=cursor;cursor=i===slices.length-1?100:cursor+s.percent;return `${s.color} ${start}% ${cursor}%`;});
 return {income,expense,remaining,deficit,slices,background:base?`conic-gradient(${stops.join(',')})`:'var(--line)'};
}
