import { expenseCategories, money, transactionTotals } from '../model';

export function TransactionRows({ transactions, records, onEdit, remove }) {
  return transactions.length ? transactions.map(t => <div className="transaction" key={t.id}><div><strong>{records[t.categoryId]?.name || 'Uncategorized'}</strong><small>{t.date} · {t.note || t.kind}</small></div><div className={`amount ${t.kind}`}>{t.kind === 'income' ? '+' : '−'}{money(t.amount / 100)}<small><button onClick={() => onEdit(t)} aria-label={`Edit transaction ${t.note || t.date}`}>Edit</button> · <button onClick={() => remove(t.id)} aria-label={`Delete transaction ${t.note || t.date}`}>Delete</button></small></div></div>) : <p className="empty">No entries on this page.</p>;
}
export function DailyTransactions({ label, transactions, ...props }) {
  const totals = transactionTotals(transactions);
  return <><h3 className="txday">{label}</h3><div className="day-totals"><span className="income">Income {money(totals.income / 100)}</span><span className="expense">Spent {money(totals.expense / 100)}</span></div><TransactionRows transactions={transactions} {...props} /></>;
}
export default function MoneySection({ month, setMonth, transactions, records, onEdit, remove }) {
  const tx = transactions.filter(t => t.date.startsWith(month));
  const totals = transactionTotals(tx), slices = expenseCategories(tx);
  let cursor = 0;
  const stops = slices.map((c, i) => { const start = cursor; cursor = i === slices.length - 1 ? 100 : cursor + c.amount / totals.expense * 100; return `${c.color} ${start}% ${cursor}%`; });
  const combined = new Map(); tx.forEach(t => combined.set(t.categoryId, (combined.get(t.categoryId) || 0) + t.amount));
  const breakdown = [...combined].sort((a, b) => b[1] - a[1]);
  const chartLabel = slices.length ? 'Monthly expenses by category: ' + slices.map(c => `${records[c.id]?.name || 'Uncategorized'} ${money(c.amount / 100)}, ${(c.amount / totals.expense * 100).toFixed(1)}%`).join('; ') : 'No expenses for the selected month';
  return <section className="financial"><div className="sectionhead"><div><span className="section-number">05 / THE BIGGER PICTURE</span><h2>This month, in numbers.</h2></div><label><span className="small">View month</span><input type="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }} aria-label="Summary month" /></label></div>
    <div className="financegrid"><div><div className="metrics"><div className="metric"><small>Income</small><strong className="income">{money(totals.income / 100)}</strong></div><div className="metric"><small>Expenses</small><strong className="expense">{money(totals.expense / 100)}</strong></div><div className="metric"><small>Savings</small><strong>{money((totals.income - totals.expense) / 100)}</strong></div></div>{breakdown.map(([id, amount]) => <div className="transaction" key={id}><span>{records[id]?.name || 'Uncategorized'}<small>{records[id]?.kind || ''}</small></span><strong>{money(amount / 100)}</strong></div>)}</div>
      <div><h3>Expenses by category</h3><div className="chartrow"><div className="donut" role="img" aria-label={chartLabel} style={{ background: totals.expense ? `conic-gradient(${stops.join(',')})` : '#e4e3d9' }}><div><small>Total expenses</small><strong>{money(totals.expense / 100)}</strong></div></div><div className="legend">{slices.map(c => <div className="category-legend" key={c.id}><span className="name"><i className="dot" style={{ background: c.color }} />{records[c.id]?.name || 'Uncategorized'}</span><span className="value">{money(c.amount / 100)}<small>{(c.amount / totals.expense * 100).toFixed(1)}%</small></span></div>)}</div></div><p className="small" style={{ marginTop: 15 }}>{totals.expense ? 'Each slice shows a category’s share of expenses for the selected month.' : 'No expenses recorded for this month.'}</p></div>
    </div><details className="transaction-history" style={{ marginTop: 30 }}><summary style={{ fontFamily: 'Georgia,serif', fontSize: 20, color: 'var(--ink)' }}>Transaction history · all dates</summary><p className="small" style={{ marginTop: 8 }}>All income and expenses, newest first. Edit or delete any entry.</p><TransactionRows transactions={[...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt)} records={records} onEdit={onEdit} remove={remove} /></details>
  </section>;
}
