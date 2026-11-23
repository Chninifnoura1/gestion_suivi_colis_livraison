import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import Modal from "../components/ui/Modal";
import Button from "../components/ui/Button";

const Ctx = createContext(null);

/* const ok = await confirm({ title, message, confirmLabel, tone: "danger" }) */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);
  const confirm = useCallback((opts) => new Promise((resolve) => { resolver.current = resolve; setState(opts); }), []);
  const close = (v) => { resolver.current?.(v); setState(null); };
  const danger = state?.tone === "danger";
  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Modal open={!!state} onClose={() => close(false)} size="sm" title={null} label={state?.title}>
        {state && (
          <div className="confirm">
            <span className={`confirm-ic ${danger ? "tone-danger" : "tone-info"}`}>{danger ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}</span>
            <h3>{state.title}</h3>
            <p>{state.message}</p>
            <div className="confirm-actions">
              <Button variant="secondary" onClick={() => close(false)}>{state.cancelLabel || "Annuler"}</Button>
              <Button variant={danger ? "danger" : "primary"} onClick={() => close(true)} autoFocus>{state.confirmLabel || "Confirmer"}</Button>
            </div>
          </div>
        )}
      </Modal>
    </Ctx.Provider>
  );
}
export const useConfirm = () => useContext(Ctx);
