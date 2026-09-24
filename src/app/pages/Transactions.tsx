import { useEffect, useMemo, useState } from 'react';
import { api, type Bootstrap, type Tx } from '../api';
import { dayLabel, money, monthLabel, shiftMonth, timeLabel, vnMonth } from '../format';
import { useToast } from '../toast';
import { SOURCE_LABEL, UNCATEGORIZED, UI } from '../../core/text';
const T = UI.tx;
import { vnDay } from '../../core/util';

export function Transactions({ boot }: { boot: Bootstrap }) {
  const toast = useToast();
  const [month, setMonth] = useState(vnMonth(new Date()));
  const [filter, setFilter] = useState<'all' | 'uncategorized'>('all');
  const [q, setQ] = useState('');
  const [txs, setTxs] = useState<Tx[] | null>(null);
  const [editing, setEditing] = useState<Tx | null>(null);

  useEffect(() => {
    setTxs(null);
    api.transactions({ month, category: filter === 'uncategorized' ? UNCATEGORIZED : undefined, q, limit: '1000' }).then(setTxs).catch(e => toast(e.message));
  }, [month, filter, q, toast]);

  const groups = useMemo(() => {
    const map = new Map<string, Tx[]>();
    for (const tx of txs || []) {
      const day = vnDay(new Date(tx.time));
      map.set(day, [...(map.get(day) || []), tx]);
    }
    return [...map.entries()];
  }, [txs]);

  function onSaved(tx: Tx | null, removedId?: string) {
    setTxs(list => {
      if (!list) return list;
      if (removedId) return list.filter(t => t.id !== removedId);
      return list.map(t => (tx && t.id === tx.id ? tx : t));
    });
    setEditing(null);
  }

  return (
    <main className="page">
      <h1>{T.title}</h1>
      <div className="monthnav">
        <button aria-label={T.prevMonth} onClick={() => setMonth(m => shiftMonth(m, -1))}>‹</button>
        <strong>{monthLabel(month)}</strong>
        <button aria-label={T.nextMonth} onClick={() => setMonth(m => shiftMonth(m, 1))}>›</button>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="toggle">
          <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>{T.all}</button>
          <button aria-pressed={filter === 'uncategorized'} onClick={() => setFilter('uncategorized')}>{T.uncategorized}</button>
        </div>
        <input className="field" placeholder={T.search} value={q} onChange={e => setQ(e.target.value)} style={{ padding: '8px 12px' }} />
      </div>

      {txs === null && <div className="empty">{T.loading}</div>}
      {txs && !txs.length && <div className="empty">{T.empty}</div>}
      {groups.map(([day, list]) => (
        <section key={day}>
          <div className="daysep">{dayLabel(list[0].time)}</div>
          <ul className="list card">
            {list.map(tx => (
              <li key={tx.id} onClick={() => setEditing(tx)} style={{ cursor: 'pointer' }}>
                <div className="main">
                  <div className="title">{tx.description || SOURCE_LABEL[tx.source] || tx.source}</div>
                  <div className="sub">
                    {timeLabel(tx.time)} · {SOURCE_LABEL[tx.source] || tx.source} · {tx.person}
                  </div>
                  <span className={'tag' + (tx.category === UNCATEGORIZED ? ' warn' : '')}>{tx.category}</span>
                </div>
                <div className={'amt num ' + tx.direction}>{tx.direction === 'in' ? '+' : ''}{money(tx.amount)}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {editing && <EditSheet tx={editing} boot={boot} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </main>
  );
}

export function EditSheet({ tx, boot, onClose, onSaved }: { tx: Tx; boot: Bootstrap; onClose: () => void; onSaved: (tx: Tx | null, removedId?: string) => void }) {
  const toast = useToast();
  const [category, setCategory] = useState(tx.category);
  const [description, setDescription] = useState(tx.description);
  const [amount, setAmount] = useState(tx.amount == null ? '' : String(tx.amount));
  const [direction, setDirection] = useState(tx.direction);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { category, description, direction };
      if (amount !== '' && Number(amount) !== tx.amount) body.amount = amount;
      const r = await api.update(tx.id, body);
      toast(T.saved);
      onSaved(r.tx);
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  }
  async function remove() {
    if (!confirm(T.confirmRemove)) return;
    setBusy(true);
    try { await api.remove(tx.id); toast(T.removed); onSaved(null, tx.id); }
    catch (e) { toast((e as Error).message); setBusy(false); }
  }

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={T.edit} onClick={e => e.stopPropagation()}>
        <h2>{money(tx.amount)} · {SOURCE_LABEL[tx.source] || tx.source}</h2>
        <div className="toggle" style={{ marginBottom: 10 }}>
          <button aria-pressed={direction === 'out'} onClick={() => setDirection('out')}>{UI.entry.expense}</button>
          <button aria-pressed={direction === 'in'} onClick={() => setDirection('in')}>{UI.entry.income}</button>
        </div>
        <select className="field" value={category} onChange={e => setCategory(e.target.value)} aria-label={T.category}>
          {boot.categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <input className="field" value={description} onChange={e => setDescription(e.target.value)} placeholder={T.description} aria-label={T.description} />
        <input className="field num" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder={T.amountVnd} aria-label={T.amountVnd} />
        <button className="btn primary" disabled={busy} onClick={save}>{T.save}</button>
        <div className="row spread" style={{ marginTop: 8 }}>
          <button className="btn ghost" onClick={onClose}>{T.close}</button>
          <button className="btn ghost" style={{ color: 'var(--warn)' }} disabled={busy} onClick={remove}>{T.remove}</button>
        </div>
      </div>
    </div>
  );
}
