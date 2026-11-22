import { ChevronLeft, ChevronRight } from "lucide-react";

const range = (page, pages) => {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i);
  const set = new Set([0, pages - 1, page - 1, page, page + 1]);
  const out = []; let prev = -1;
  [...set].filter((n) => n >= 0 && n < pages).sort((a, b) => a - b).forEach((n) => { if (n - prev > 1) out.push("…"); out.push(n); prev = n; });
  return out;
};

export default function Pagination({ page, pageSize, total, onPage, onPageSize, sizes = [8, 15, 30] }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? page * pageSize + 1 : 0, to = Math.min(total, (page + 1) * pageSize);
  return (
    <nav className="pagination" aria-label="Pagination">
      <div className="pagination-info tabular">{from}–{to} sur {total}</div>
      <div className="pagination-pages">
        <button className="pg" onClick={() => onPage(page - 1)} disabled={page === 0} aria-label="Page précédente"><ChevronLeft size={16} /></button>
        {range(page, pages).map((n, i) => n === "…" ? <span key={`e${i}`} className="pg-gap">…</span> : (
          <button key={n} className={`pg${n === page ? " on" : ""}`} aria-current={n === page ? "page" : undefined} onClick={() => onPage(n)}>{n + 1}</button>
        ))}
        <button className="pg" onClick={() => onPage(page + 1)} disabled={page >= pages - 1} aria-label="Page suivante"><ChevronRight size={16} /></button>
      </div>
      {onPageSize && (
        <label className="pagination-size"><span className="sr-only">Lignes par page</span>
          <select value={pageSize} onChange={(e) => onPageSize(+e.target.value)}>{sizes.map((s) => <option key={s} value={s}>{s} / page</option>)}</select>
        </label>
      )}
    </nav>
  );
}
