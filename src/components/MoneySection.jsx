import MoneyDonut from './MoneyDonut';
const wholeMoney=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:0}).format(n);
import ActionIconButton from './ActionIconButton';
import { expenseCategories, money, transactionTotals } from '../model';

export function TransactionRows({ transactions, records, onEdit, remove }) {
  return transactions.length ? transactions.map(t => <div className="transaction" key={t.id}><div><strong>{records[t.categoryId]?.name || 'Uncategorized'}</strong><small>{t.date} · {t.note || t.kind}</small></div><div className={`amount ${t.kind}`}>{t.kind === 'income' ? '+' : '−'}{money(t.amount / 100)}<small><ActionIconButton action="edit" label={`Edit transaction ${t.note || t.date}`} onClick={() => onEdit(t)} className="" /> <ActionIconButton action="delete" label={`Delete transaction ${t.note || t.date}`} onClick={() => remove(t.id)} className="" /></small></div></div>) : <p className="empty">No entries on this page.</p>;
}
export function DailyTransactions({ label, transactions, ...props }) {
  const totals = transactionTotals(transactions);
  return <><h3 className="txday">{label}</h3><div className="day-totals"><span className="income">Income {money(totals.income / 100)}</span><span className="expense">Spent {money(totals.expense / 100)}</span></div><TransactionRows transactions={transactions} {...props} /></>;
}
export default function MoneySection({ month, setMonth, transactions, records, onEdit, remove }) {
  const tx = transactions.filter(t => t.date.startsWith(month));
  const totals=transactionTotals(tx);
  const combined = new Map(); tx.forEach(t => combined.set(t.categoryId, (combined.get(t.categoryId) || 0) + t.amount));
  const breakdown = [...combined].sort((a, b) => b[1] - a[1]);
  return <section className="financial"><div className="sectionhead"><div><span className="section-number">05 / THE BIGGER PICTURE</span><h2>This month, in numbers.</h2></div><label><span className="small">View month</span><input type="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }} aria-label="Summary month" /></label></div>
    <div className="metrics money-summary"><div className="metric"><small>Income</small><strong className="income">{wholeMoney(totals.income / 100)}</strong></div><div className="metric"><small>Expenses</small><strong className="expense">{wholeMoney(totals.expense / 100)}</strong></div><div className="metric"><small>Savings</small><strong>{wholeMoney((totals.income - totals.expense) / 100)}</strong></div></div><div className="financegrid"><div>{breakdown.map(([id, amount]) => <div className="transaction" key={id}><span>{records[id]?.name || 'Uncategorized'}<small>{records[id]?.kind || ''}</small></span><strong>{money(amount / 100)}</strong></div>)}</div>
      <div><h3>Income & expenses</h3><MoneyDonut transactions={tx} records={records} period={month}/></div>
    </div><details className="transaction-history" style={{ marginTop: 30 }}><summary style={{ fontFamily: 'Georgia,serif', fontSize: 20, color: 'var(--ink)' }}>Transaction history · all dates</summary><p className="small" style={{ marginTop: 8 }}>All income and expenses, newest first. Edit or delete any entry.</p><TransactionRows transactions={[...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt)} records={records} onEdit={onEdit} remove={remove} /></details>
  </section>;
}
