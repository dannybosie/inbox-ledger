import { useEffect, useRef, useState } from 'react';
import { api, type Bootstrap, type Tx } from '../api';
import { money, parseAmount, dayLabel } from '../format';
import { useToast } from '../toast';
import { INCOME_CATEGORY, INTERNAL_CATEGORY, SMALL_SPEND_CATEGORY, UNCATEGORIZED, UI } from '../../core/text';
const T = UI.entry;

const HIDDEN_FOR_ENTRY = new Set([SMALL_SPEND_CATEGORY, UNCATEGORIZED]);

/** The first screen: record a cash or e-wallet payment in three taps. */
export function Entry({ boot }: { boot: Bootstrap }) {
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'out' | 'in'>('out');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [recent, setRecent] = useState<Tx[]>([]);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => { api.transactions({ limit: '6' }).then(setRecent).catch(() => {}); }, []);

  const parsed = parseAmount(amount);
  const categories = boot.categories.filter(c =>
    !HIDDEN_FOR_ENTRY.has(c) && (direction === 'in' ? c === INCOME_CATEGORY || c === INTERNAL_CATEGORY || c === 'Other' : c !== INCOME_CATEGORY)
  );

  async function save() {
    if (!parsed || !category) return;
    setSaving(true);
    try {
      const r = await api.add({ amount: parsed, category, note, direction });
      toast(r.message);
      setRecent(list => [r.tx, ...list].slice(0, 6));
      setAmount(''); setNote(''); setCategory('');
      amountRef.current?.focus();
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page">
      <div className="row spread">
        <h1>{T.title}</h1>
        <div className="toggle" role="group" aria-label={T.directionGroup}>
          <button aria-pressed={direction === 'out'} onClick={() => { setDirection('out'); setCategory(''); }}>{T.expense}</button>
          <button aria-pressed={direction === 'in'} onClick={() => { setDirection('in'); setCategory(''); }}>{T.income}</button>
        </div>
      </div>

      <div className="entry-amount">
        <input ref={amountRef} inputMode="decimal" autoComplete="off" placeholder="0" aria-label={T.amountLabel}
          value={amount} onChange={e => setAmount(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} />
      </div>
      <div className="entry-preview num" aria-live="polite">
        {amount && !parsed && T.amountBad}
        {parsed && <>= <strong>{money(parsed)}</strong></>}
        {!amount && T.amountHint}
      </div>

      <div className="chips" role="group" aria-label={T.categoryGroup}>
        {categories.map(c => (
          <button key={c} className="chip" aria-pressed={category === c} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>

      <input className="field" placeholder={T.note} value={note} onChange={e => setNote(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && save()} />
      <div style={{ height: 12 }} />
      <button className="btn primary" disabled={!parsed || !category || saving} onClick={save}>
        {saving ? T.saving : parsed && category ? T.save(money(parsed), category) : T.needInput}
      </button>

      {recent.length > 0 && (
        <section className="section">
          <h2 className="small muted" style={{ fontWeight: 600 }}>{T.recent}</h2>
          <ul className="list card">
            {recent.map(tx => (
              <li key={tx.id}>
                <div className="main">
                  <div className="title">{tx.description || tx.category}</div>
                  <div className="sub">{dayLabel(tx.time)} · {tx.category} · {tx.person}</div>
                </div>
                <div className={'amt num ' + tx.direction}>{tx.direction === 'in' ? '+' : ''}{money(tx.amount)}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
