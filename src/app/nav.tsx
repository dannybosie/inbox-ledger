import { useEffect, useState } from 'react';
import { UI } from '../core/text';

const TABS = [
  { path: '/', label: UI.tabs.entry, icon: 'M12 5v14M5 12h14' },
  { path: '/transactions', label: UI.tabs.transactions, icon: 'M4 6h16M4 12h16M4 18h10' },
  { path: '/overview', label: UI.tabs.overview, icon: 'M5 20V10M12 20V4M19 20v-7' },
  { path: '/settings', label: UI.tabs.settings, icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z' },
];

export function useRoute() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const onPop = () => setPath(location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return TABS.some(t => t.path === path) ? path : '/';
}

export function navigate(path: string) {
  history.pushState(null, '', path);
  dispatchEvent(new PopStateEvent('popstate'));
}

export function TabBar() {
  const route = useRoute();
  return (
    <nav className="tabbar" aria-label="Navigation">
      {TABS.map(t => (
        <a key={t.path} href={t.path} aria-current={route === t.path ? 'page' : undefined}
          onClick={e => { e.preventDefault(); navigate(t.path); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
          {t.label}
        </a>
      ))}
    </nav>
  );
}
