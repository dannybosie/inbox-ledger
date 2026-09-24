import { useCallback, useEffect, useState } from 'react';
import { NotSignedIn, api, type Bootstrap } from './api';
import { Login } from './pages/Login';
import { Entry } from './pages/Entry';
import { Transactions } from './pages/Transactions';
import { Overview } from './pages/Overview';
import { Settings } from './pages/Settings';
import { TabBar, useRoute } from './nav';
import { ToastProvider } from './toast';
import { UI } from '../core/text';

export function App() {
  const route = useRoute();
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [error, setError] = useState('');
  const [signedOut, setSignedOut] = useState(false);
  const reload = useCallback(
    () =>
      api
        .bootstrap()
        .then(b => { setBoot(b); setSignedOut(false); setError(''); })
        .catch(e => (e instanceof NotSignedIn ? setSignedOut(true) : setError(e.message))),
    []
  );
  useEffect(() => { reload(); }, [reload]);

  if (signedOut) return <Login onDone={reload} />;
  if (error) return <div className="page empty">{UI.loadError}{error}</div>;
  if (!boot) return <div className="page empty">{UI.loading}</div>;

  return (
    <ToastProvider>
      {route === '/' && <Entry boot={boot} />}
      {route === '/transactions' && <Transactions boot={boot} />}
      {route === '/overview' && <Overview boot={boot} />}
      {route === '/settings' && <Settings boot={boot} reload={reload} />}
      <TabBar />
    </ToastProvider>
  );
}
