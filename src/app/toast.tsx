import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

const Ctx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState('');
  const timer = useRef<number>(0);
  const show = useCallback((m: string) => {
    setMsg(m);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(''), 2600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </Ctx.Provider>
  );
}
