import { cloneElement, useEffect, useLayoutEffect, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { IconButton } from "./Button";

/* Popover positionné en `fixed` dans un portail : n'est jamais rogné par un conteneur `overflow`. */
export function Popover({ trigger, children, align = "end", width, className = "" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btn = useRef(null), panel = useRef(null), id = useId();

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect(), h = panel.current?.offsetHeight || 260, w = panel.current?.offsetWidth || width || 220;
    const below = r.bottom + 8 + h <= window.innerHeight || r.top < h + 16;
    const left = align === "end" ? Math.max(8, Math.min(r.right - w, window.innerWidth - w - 8)) : Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
    setPos({ top: below ? r.bottom + 8 : undefined, bottom: below ? undefined : window.innerHeight - r.top + 8, left, origin: below ? "top" : "bottom" });
  }, [open, align, width]);

  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!panel.current?.contains(e.target) && !btn.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", away); document.addEventListener("keydown", key);
    window.addEventListener("resize", close); window.addEventListener("scroll", close, true);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", key); window.removeEventListener("resize", close); window.removeEventListener("scroll", close, true); };
  }, [open]);

  const el = cloneElement(trigger, { ref: btn, "aria-haspopup": "true", "aria-expanded": open, "aria-controls": open ? id : undefined, onClick: (e) => { e.stopPropagation(); setOpen((o) => !o); } });
  return (
    <>
      {el}
      {open && createPortal(
        <div id={id} ref={panel} className={`popover ${className}`} style={{ ...pos, width, visibility: pos ? "visible" : "hidden", transformOrigin: `${align === "end" ? "right" : "left"} ${pos?.origin || "top"}` }} onClick={(e) => e.stopPropagation()}>
          {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
        </div>, document.body)}
    </>
  );
}

/* Menu d'actions : items = [{ label, icon, onClick, tone, disabled, separator }] */
export function Menu({ items, trigger, label = "Actions", align = "end" }) {
  return (
    <Popover align={align} width={220} trigger={trigger || <IconButton icon={MoreHorizontal} label={label} size="sm" />}>
      {({ close }) => (
        <div className="menu" role="menu">
          {items.filter(Boolean).map((it, i) => it.separator ? <hr key={i} /> : (
            <button key={it.label} role="menuitem" disabled={it.disabled} className={`menu-item${it.tone === "danger" ? " danger" : ""}`} onClick={() => { close(); it.onClick?.(); }}>
              {it.icon && <it.icon size={16} aria-hidden />}<span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

export function Tooltip({ label, side = "top", children, disabled }) {
  const [state, setState] = useState(null);
  const ref = useRef(null), id = useId();
  const show = () => { if (disabled || !ref.current) return; const r = ref.current.getBoundingClientRect(); setState(r); };
  const hide = () => setState(null);
  const style = state && (side === "right" ? { top: state.top + state.height / 2, left: state.right + 10, transform: "translateY(-50%)" } : side === "bottom" ? { top: state.bottom + 8, left: state.left + state.width / 2, transform: "translateX(-50%)" } : { top: state.top - 8, left: state.left + state.width / 2, transform: "translate(-50%,-100%)" });
  return (
    <span ref={ref} className="tt-wrap" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide} aria-describedby={state ? id : undefined}>
      {children}
      {state && createPortal(<span id={id} role="tooltip" className="tooltip" style={style}>{label}</span>, document.body)}
    </span>
  );
}
