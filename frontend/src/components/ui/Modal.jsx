import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { IconButton } from "./Button";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/* Base commune Modal / Drawer : focus piégé, Échap, verrouillage du scroll, restauration du focus. */
function Overlay({ open, onClose, children, variant, size, label }) {
  const panel = useRef(null), last = useRef(null);
  useEffect(() => {
    if (!open) return;
    last.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = panel.current;
    const target = node.querySelector("[autofocus],[data-autofocus]") || node.querySelector(FOCUSABLE) || node;
    requestAnimationFrame(() => target.focus({ preventScroll: true }));
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); }
      if (e.key !== "Tab") return;
      const items = [...node.querySelectorAll(FOCUSABLE)];
      if (!items.length) return;
      const first = items[0], end = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); end.focus(); }
      else if (!e.shiftKey && document.activeElement === end) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prevOverflow; last.current?.focus?.({ preventScroll: true }); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className={`overlay overlay-${variant}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} className={`${variant} ${variant}-${size}`} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>{children}</div>
    </div>, document.body);
}

export default function Modal({ open, onClose, title, description, size = "md", footer, children, label }) {
  return (
    <Overlay open={open} onClose={onClose} variant="modal" size={size} label={label || title}>
      {title && (
        <header className="modal-head">
          <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
          <IconButton icon={X} label="Fermer" onClick={onClose} size="sm" />
        </header>
      )}
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-foot">{footer}</footer>}
    </Overlay>
  );
}

export function Drawer({ open, onClose, title, description, footer, children, size = "md" }) {
  return (
    <Overlay open={open} onClose={onClose} variant="drawer" size={size} label={title}>
      <header className="modal-head">
        <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
        <IconButton icon={X} label="Fermer" onClick={onClose} size="sm" />
      </header>
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-foot">{footer}</footer>}
    </Overlay>
  );
}
