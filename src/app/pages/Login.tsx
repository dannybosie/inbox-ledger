import { useState } from 'react';
import { api } from '../api';
import { UI } from '../../core/text';

const T = UI.login;

/**
 * The sign-in page is deliberately bare: a stranger sees one email field
 * and nothing about what is behind it. An address that is not allowed gets
 * the same answer, but never receives a code.
 */
export function Login({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    if (!email.trim()) return;
    setBusy(true); setError('');
    try {
      await api.requestCode(email.trim());
      setStep('code');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function verify() {
    if (!/^\d{6}$/.test(code.trim())) return;
    setBusy(true); setError('');
    try {
      await api.verifyCode(email.trim(), code.trim());
      onDone();
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }

  return (
    <main className="page login">
      <h1>{T.title}</h1>
      {step === 'email' ? (
        <>
          <input className="field" type="email" inputMode="email" autoComplete="email" autoFocus
            placeholder={T.emailPlaceholder} aria-label={T.emailLabel}
            value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
          <button className="btn primary" disabled={busy || !email.trim()} onClick={send}>{busy ? T.sending : T.sendCode}</button>
        </>
      ) : (
        <>
          <p className="small muted">{T.codeSent}</p>
          <input className="field num" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6}
            placeholder={T.codePlaceholder} aria-label={T.codeLabel}
            value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={e => e.key === 'Enter' && verify()} />
          <button className="btn primary" disabled={busy || code.length !== 6} onClick={verify}>{busy ? T.verifying : T.verify}</button>
          <div className="row spread">
            <button className="btn ghost" onClick={() => { setStep('email'); setCode(''); setError(''); }}>{T.back}</button>
            <button className="btn ghost" disabled={busy} onClick={send}>{T.resend}</button>
          </div>
          <p className="small muted">{T.staySignedIn}</p>
        </>
      )}
      {error && <p className="small" style={{ color: 'var(--warn)' }} role="alert">{error}</p>}
    </main>
  );
}
