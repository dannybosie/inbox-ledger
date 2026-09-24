import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api, type Bootstrap, type Summary, type Tx } from '../api';
import { money, monthLabel, shiftMonth, vnMonth, dayLabel } from '../format';
import { useToast } from '../toast';
import { navigate } from '../nav';
import { EditSheet } from './Transactions';
import { MONTH_SHORT, UI } from '../../core/text';
const T = UI.overview;

export function Overview({ boot }: { boot: Bootstrap }) {
  const toast = useToast();
  const [month, setMonth] = useState(vnMonth(new Date()));
  const [s, setS] = useState<Summary | null>(null);
  const [editing, setEditing] = useState<Tx | null>(null);
  const load = () => api.summary(month).then(setS).catch(e => toast(e.message));
  useEffect(() => { setS(null); load(); }, [month]); // eslint-disable-line react-hooks/exhaustive-deps

  const max = s ? Math.max(1, ...s.byCategory.map(c => c.amount)) : 1;

  return (
    <main className="page">
      <h1>{T.title}</h1>
      <div className="monthnav">
        <button aria-label={UI.tx.prevMonth} onClick={() => setMonth(m => shiftMonth(m, -1))}>‹</button>
        <strong>{monthLabel(month)}</strong>
        <button aria-label={UI.tx.nextMonth} onClick={() => setMonth(m => shiftMonth(m, 1))}>›</button>
      </div>

      {!s && <div className="empty">{T.computing}</div>}
      {s && (
        <>
          <div className="card stat">
            <div className="label">{T.total(s.count)}</div>
            <div className="value num">{money(s.total)}</div>
            {s.income > 0 && <div className="small muted num">{T.income}{money(s.income)}</div>}
          </div>

          {s.uncategorized > 0 && (
            <section className="section">
              <div className="row spread">
                <h2>{T.needCategory(s.uncategorized)}</h2>
                <button className="btn ghost" onClick={() => navigate('/transactions')}>{T.seeAll}</button>
              </div>
              <ul className="list card">
                {s.uncategorizedItems.slice(0, 5).map(tx => (
                  <li key={tx.id} onClick={() => setEditing(tx)} style={{ cursor: 'pointer' }}>
                    <div className="main">
                      <div className="title">{tx.description || tx.source}</div>
                      <div className="sub">{dayLabel(tx.time)} · {tx.person}</div>
                    </div>
                    <div className="amt num">{money(tx.amount)}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="section">
            <h2>{T.byCategory}</h2>
            {!s.byCategory.length && <div className="empty">{T.noSpending}</div>}
            <div className="bars">
              {s.byCategory.map(c => (
                <div className="bar" key={c.category}>
                  <span>{c.category}</span>
                  <span className="num" style={{ fontWeight: 700 }}>{money(c.amount)}</span>
                  <div className="track"><div className="fill" style={{ width: (100 * c.amount / max) + '%' }} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="section">
            <h2>{T.lastMonths}</h2>
            <div className="card" style={{ padding: '12px 8px 4px' }}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={s.months.map(m => ({ ...m, label: MONTH_SHORT[Number(m.month.slice(5)) - 1] }))} onClick={e => {
                  const m = (e as { activePayload?: { payload: { month: string } }[] })?.activePayload?.[0]?.payload.month;
                  if (m) setMonth(m);
                }}>
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-2)', fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'var(--surface-2)' }} formatter={(v) => [money(Number(v)), T.spent]} labelFormatter={(_, p) => monthLabel((p?.[0]?.payload as { month: string })?.month || month)}
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, color: 'var(--ink)' }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {s.months.map(m => <Cell key={m.month} fill={m.month === month ? 'var(--accent)' : 'var(--line)'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
      {editing && <EditSheet tx={editing} boot={boot} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </main>
  );
}
