import { useState } from 'react';
import { money, transactionTotals } from '../model';
import ActionIconButton from '../components/ActionIconButton';
import { Icon } from './EntryDialog';

export function expenseBreakdown(transactions, month) {
  const totals = new Map();
  for (const tx of transactions) if (!tx.deleted && tx.kind === 'expense' && (!month || tx.date.startsWith(month + '-'))) totals.set(tx.categoryId, (totals.get(tx.categoryId) || 0) + tx.amount);
  const colors = ['#d96b1f','#ed9d54','#f5c38f','#b94b0c','#fbe1c3','#dc8340'];
  return [...totals].sort((a, b) => b[1] - a[1]).map(([id, amount], i) => ({ id, amount, color: colors[i % colors.length] }));
}
export function filterTransactions(transactions, period, value) {
  return transactions.filter(t => !t.deleted && (period === 'all' || (period === 'month' ? t.date.startsWith(value + '-') : t.date === value)));
}
export default function MoneyPage({ records, date, transactions, onAdd, onEdit, remove }) {
  const [period, setPeriod] = useState('day'), [day, setDay] = useState(date), [month, setMonth] = useState(date.slice(0,7));
  const selected = period === 'month' ? month : day;
  const filtered = filterTransactions(transactions, period, selected);
  const daily = transactionTotals(filtered);
  const slices = expenseBreakdown(filtered, ''), total = slices.reduce((sum, slice) => sum + slice.amount, 0);
  let position = 0;
  const stops = slices.map(s => { const from = position; position += s.amount / total * 100; return `${s.color} ${from}% ${position}%`; });
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  return <><div className="page-top"><div className="eyebrow">The money diary</div><h1>Your money, clearly.</h1><div className="money-filters"><label>Period<select aria-label="Money period" value={period} onChange={e => setPeriod(e.target.value)}><option value="all">All time</option><option value="month">Monthly</option><option value="day">Particular day</option></select></label>{period !== 'all' && <label>{period === 'month' ? 'Month' : 'Day'}<input aria-label="Money date" type={period === 'month' ? 'month' : 'date'} value={selected} onChange={e => { if(e.target.value) (period === 'month' ? setMonth : setDay)(e.target.value); }} /></label>}</div><div className="stats" aria-label="Money totals"><div className="stat"><small>Total income</small><strong>{money(daily.income / 100)}</strong></div><div className="stat"><small>Total expenses</small><strong>{money(daily.expense / 100)}</strong></div><div className="stat"><small>Savings</small><strong>{money((daily.income - daily.expense) / 100)}</strong></div></div></div><section><div className="section-heading"><h2>Expenses by category</h2></div><div className="chart-row"><div className="donut" role="img" aria-label={`Expenses by category for ${period === 'all' ? 'all time' : selected}`} style={{ background: total ? `conic-gradient(${stops.join(',')})` : '#f7eee5' }}><div className="donut-hole"><small>Total expenses</small><strong>{money(total / 100)}</strong></div></div><div className="legend">{slices.map(slice => <div className="legend-row" key={slice.id}><i style={{ background: slice.color }} /><div><b>{records[slice.id]?.name || 'Uncategorized'}</b><small>{money(slice.amount / 100)} · {Math.round(slice.amount / total * 100)}%</small></div></div>)}{!slices.length && <small>No expenses in this period.</small>}</div></div></section><section><div className="section-heading"><h2>Transactions</h2><button className="view-all" onClick={onAdd}>+ New transaction</button></div>{sorted.map((tx, i) => { const category = records[tx.categoryId]; return <div key={tx.id}>{(i === 0 || sorted[i - 1].date !== tx.date) && <div className="date-label">{tx.date === date ? 'Today' : new Date(tx.date + 'T12:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}</div>}<details className="transaction-entry"><summary className={`transaction ${tx.kind}`} aria-label={`Transaction ${category?.name || 'Uncategorized'} ${money(tx.amount / 100)}`}><span className="transaction-icon" aria-hidden="true">{tx.kind === 'income' ? '↙' : '↗'}</span><span className="category-image"><Icon record={category || {}} /></span><div className="grow"><h3>{category?.name || 'Uncategorized'}</h3><small>{tx.note || (tx.kind === 'income' ? 'Income' : 'Expense')}</small></div><strong>{tx.kind === 'income' ? '+' : '−'}{money(tx.amount / 100)}</strong><span className="transaction-menu" aria-hidden="true">⋮</span></summary><div className="transaction-actions"><ActionIconButton action="edit" label={`Edit transaction ${tx.note || category?.name || ''}`} onClick={() => onEdit(tx)} /><ActionIconButton action="delete" label={`Delete transaction ${tx.note || category?.name || ''}`} onClick={() => remove(tx.id)} /></div></details></div>; })}{!filtered.length && <p className="empty">No transactions in this period.</p>}</section></>;
}
