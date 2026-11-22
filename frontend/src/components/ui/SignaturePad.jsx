import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

/* Zone de signature tactile/souris. `onChange(true|false)` indique si une signature est présente. */
export default function SignaturePad({ onChange }) {
  const ref = useRef(null), drawing = useRef(false), [has, setHas] = useState(false);
  useEffect(() => {
    const c = ref.current, ratio = window.devicePixelRatio || 1, r = c.getBoundingClientRect();
    c.width = r.width * ratio; c.height = r.height * ratio;
    const ctx = c.getContext("2d"); if (!ctx) return; ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--text").trim() || "#17243a";
  }, []);
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e) => { drawing.current = true; ref.current.setPointerCapture(e.pointerId); const ctx = ref.current.getContext("2d"); if (!ctx) return; ctx.beginPath(); ctx.moveTo(...pos(e)); };
  const move = (e) => { if (!drawing.current) return; const ctx = ref.current.getContext("2d"); if (!ctx) return; ctx.lineTo(...pos(e)); ctx.stroke(); if (!has) { setHas(true); onChange?.(true); } };
  const up = () => { drawing.current = false; };
  const clear = () => { const c = ref.current; c.getContext("2d")?.clearRect(0, 0, c.width, c.height); setHas(false); onChange?.(false); };
  return (
    <div className="sig">
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Zone de signature" role="img" />
      {!has && <span className="sig-hint">Signez ici avec le doigt ou la souris</span>}
      {has && <button type="button" className="link-btn" onClick={clear}><Eraser size={14} />Effacer</button>}
    </div>
  );
}
