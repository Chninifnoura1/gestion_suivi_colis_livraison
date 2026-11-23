import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

const Ctx = createContext(null);
const ICONS = { success: CheckCircle2, warning: AlertTriangle, danger: XCircle, info: Info };
let seq = 0;

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const dismiss = useCallback((id) => setItems((l) => l.filter((t) => t.id !== id)), []);
  const push = useCallback((tone, title, message) => {
    const id = ++seq;
    setItems((l) => [...l.slice(-3), { id, tone, title, message }]);
    setTimeout(() => dismiss(id), 4800);
  }, [dismiss]);
  const api = useMemo(() => ({
    success: (t, m) => push("success", t, m), error: (t, m) => push("danger", t, m),
    warning: (t, m) => push("warning", t, m), info: (t, m) => push("info", t, m),
  }), [push]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="toasts" role="region" aria-label="Notifications" aria-live="polite">
        {items.map((t) => {
          const I = ICONS[t.tone];
          return (
            <div key={t.id} className={`toast toast-${t.tone}`} role="status">
              <I size={20} className="toast-ic" />
              <div className="toast-body"><strong>{t.title}</strong>{t.message && <span>{t.message}</span>}</div>
              <button className="toast-x" onClick={() => dismiss(t.id)} aria-label="Fermer"><X size={16} /></button>
              <i className="toast-life" />
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = () => useContext(Ctx);
