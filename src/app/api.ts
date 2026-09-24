export interface Tx {
  id: string; time: string; amount: number | null; direction: 'out' | 'in'; category: string;
  description: string; person: string; source: string; sourceId: string;
}
export interface Bootstrap {
  me: { email: string; name: string };
  categories: string[];
  rules: { keyword: string; category: string }[];
  people: { email: string; name: string; role: string }[];
  settings: Record<string, string>;
}
export interface Summary {
  month: string; total: number; count: number; income: number;
  byCategory: { category: string; amount: number }[];
  uncategorized: number; uncategorizedItems: Tx[];
  months: { month: string; total: number; count: number }[];
}

export class NotSignedIn extends Error {
  constructor() { super('Not signed in'); }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/api/auth/')) throw new NotSignedIn();
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Error ' + res.status);
  return data as T;
}

export const api = {
  requestCode: (email: string) => call<{ ok: true; devCode?: string }>('POST', '/api/auth/request', { email }),
  verifyCode: (email: string, code: string) => call<{ ok: true }>('POST', '/api/auth/verify', { email, code }),
  signOut: () => call<{ ok: true }>('POST', '/api/auth/signout'),
  bootstrap: () => call<Bootstrap>('GET', '/api/bootstrap'),
  transactions: (q: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v) params.set(k, v);
    return call<Tx[]>('GET', '/api/transactions?' + params);
  },
  add: (body: unknown) => call<{ tx: Tx; message: string }>('POST', '/api/transactions', body),
  update: (id: string, body: unknown) => call<{ tx: Tx }>('PATCH', '/api/transactions/' + id, body),
  remove: (id: string) => call<{ ok: true }>('DELETE', '/api/transactions/' + id),
  summary: (month: string) => call<Summary>('GET', '/api/summary?month=' + month),
  saveCategories: (categories: string[], renames: { from: string; to: string }[]) => call('PUT', '/api/categories', { categories, renames }),
  saveRules: (rules: { keyword: string; category: string }[]) => call('PUT', '/api/rules', { rules }),
  reapplyRules: () => call<{ updated: number }>('POST', '/api/rules/reapply'),
  saveSettings: (settings: Record<string, string>) => call('PUT', '/api/settings', settings),
  savePeople: (people: { email: string; name: string; role: string }[]) => call('PUT', '/api/people', { people }),
  emailLog: () => call<{ received_at: number; sender: string; subject: string; status: string; detail: string }[]>('GET', '/api/email-log'),
  sendReport: () => call<{ recipients: number }>('POST', '/api/report/send'),
};
