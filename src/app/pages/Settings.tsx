import { useEffect, useState } from 'react';
import { api, type Bootstrap } from '../api';
import { useToast } from '../toast';
import { INTERNAL_CATEGORY, SMALL_SPEND_CATEGORY, UNCATEGORIZED, UI } from '../../core/text';
const T = UI.settings;

const LOCKED = new Set([UNCATEGORIZED, INTERNAL_CATEGORY, SMALL_SPEND_CATEGORY]);

export function Settings({ boot, reload }: { boot: Bootstrap; reload: () => void }) {
  const toast = useToast();
  const [categories, setCategories] = useState(boot.categories.map(name => ({ name, original: name })));
  const [rules, setRules] = useState(boot.rules);
  const [people, setPeople] = useState(boot.people.length ? boot.people : [{ email: boot.me.email, name: '', role: 'PRIMARY' }, { email: '', name: '', role: 'PARTNER' }]);
  const [small, setSmall] = useState(boot.settings.small_amount || '500000');
  const [fxUsd, setFxUsd] = useState(boot.settings.fx_USD || '');
  const [log, setLog] = useState<Awaited<ReturnType<typeof api.emailLog>> | null>(null);

  useEffect(() => { api.emailLog().then(setLog).catch(() => {}); }, []);

  const run = (fn: () => Promise<unknown>, done: string) => fn().then(() => { toast(done); reload(); }).catch(e => toast((e as Error).message));

  return (
    <main className="page">
      <h1>{T.title}</h1>
      <div className="row spread">
        <p className="small muted">{T.signedIn}{boot.me.email}</p>
        <button className="btn ghost" onClick={() => api.signOut().then(() => location.reload())}>{UI.login.signOut}</button>
      </div>

      <section className="section">
        <h2>{T.family}</h2>
        <p className="small muted">{T.familyHint}</p>
        <div className="editlist">
          {people.map((p, i) => (
            <div className="row" key={i}>
              <input className="field" placeholder={T.email} value={p.email} onChange={e => setPeople(l => l.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} />
              <input className="field" placeholder={T.name} value={p.name} style={{ maxWidth: 110 }} onChange={e => setPeople(l => l.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              <select className="field" value={p.role} style={{ maxWidth: 100 }} onChange={e => setPeople(l => l.map((x, j) => j === i ? { ...x, role: e.target.value } : x))}>
                <option value="PRIMARY">{T.primary}</option><option value="PARTNER">{T.partner}</option><option value="">{T.other}</option>
              </select>
            </div>
          ))}
          <button className="btn" onClick={() => run(() => api.savePeople(people), T.saved)}>{T.saveNames}</button>
        </div>
      </section>

      <section className="section">
        <h2>{T.categories}</h2>
        <div className="editlist">
          {categories.map((c, i) => (
            <div className="row" key={i}>
              <input className="field" value={c.name} disabled={LOCKED.has(c.original)} onChange={e => setCategories(l => l.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
              {!LOCKED.has(c.original) && <button className="iconbtn" aria-label={T.remove} onClick={() => setCategories(l => l.filter((_, j) => j !== i))}>×</button>}
            </div>
          ))}
          <div className="row">
            <button className="btn" onClick={() => setCategories(l => [...l, { name: '', original: '' }])}>{T.addCategory}</button>
            <button className="btn primary" style={{ width: 'auto' }} onClick={() => {
              const names = categories.map(c => c.name.trim()).filter(Boolean);
              const renames = categories.filter(c => c.original && c.name.trim() && c.name.trim() !== c.original).map(c => ({ from: c.original, to: c.name.trim() }));
              run(() => api.saveCategories(names, renames), T.savedCategories);
            }}>{T.save}</button>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>{T.rules}</h2>
        <p className="small muted">{T.rulesHint}</p>
        <div className="editlist">
          {rules.map((r, i) => (
            <div className="row" key={i}>
              <input className="field" placeholder={T.keyword} value={r.keyword} onChange={e => setRules(l => l.map((x, j) => j === i ? { ...x, keyword: e.target.value } : x))} />
              <select className="field" value={r.category} style={{ maxWidth: 150 }} onChange={e => setRules(l => l.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}>
                {boot.categories.map(c => <option key={c}>{c}</option>)}
              </select>
              <button className="iconbtn" aria-label={T.remove} onClick={() => setRules(l => l.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
          <div className="row">
            <button className="btn" onClick={() => setRules(l => [{ keyword: '', category: boot.categories[0] }, ...l])}>{T.addRule}</button>
            <button className="btn primary" style={{ width: 'auto' }} onClick={() => run(() => api.saveRules(rules), T.savedRules)}>{T.save}</button>
          </div>
          <button className="btn ghost" style={{ textAlign: 'left' }} onClick={() => api.reapplyRules().then(r => toast(T.reapplied(r.updated))).catch(e => toast(e.message))}>
            {T.reapply}
          </button>
        </div>
      </section>

      <section className="section">
        <h2>{T.smallTitle}</h2>
        <p className="small muted">{T.smallHint}</p>
        <div className="row">
          <input className="field num" inputMode="numeric" value={small} onChange={e => setSmall(e.target.value)} />
          <input className="field num" inputMode="decimal" placeholder={T.fxUsd} value={fxUsd} onChange={e => setFxUsd(e.target.value)} />
          <button className="btn" onClick={() => run(() => api.saveSettings({ small_amount: small, fx_USD: fxUsd }), T.saved)}>{T.save}</button>
        </div>
      </section>

      <section className="section">
        <h2>{T.emailLog}</h2>
        <p className="small muted">{T.emailLogHint}</p>
        {log && !log.length && <div className="small muted">{T.noEmails}</div>}
        {log && log.length > 0 && (
          <pre className="log">{log.map(e => `${new Date(e.received_at).toLocaleString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' })}  [${e.status}] ${e.subject}\n    ${e.detail}`).join('\n')}</pre>
        )}
        <button className="btn ghost" onClick={() => api.sendReport().then(r => toast(T.reportSent(r.recipients))).catch(e => toast(e.message))}>{T.sendReport}</button>
      </section>
    </main>
  );
}
