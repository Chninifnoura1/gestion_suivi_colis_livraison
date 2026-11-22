import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, FilterX, SearchX } from "lucide-react";
import { SearchInput, Pagination, Skeleton, EmptyState, Menu, ErrorState } from "../ui";
import Button from "../ui/Button";
import { toInputDate } from "../../lib/format";

/* ─────────────────────────────────────────────────────────────────────────────
   DataTable : recherche, filtres, période, tri, pagination, menu d'actions,
   squelette de chargement, états vides, rendu « cartes » sur mobile.

   columns : [{ key, header, render?(row), sort?(row)=>valeur, primary?, hideMobile?, align?, width? }]
   filters : [{ id, label, options:[{value,label}], get(row)=>valeur }]
   dates   : { label, get(row)=>ISO }
   actions : (row) => [{ label, icon, onClick, tone, disabled, separator }]
   ───────────────────────────────────────────────────────────────────────────── */
export default function DataTable({
  columns, rows, loading, error, onRetry, rowKey = "id", searchPlaceholder = "Rechercher…", searchText, initialQuery = "",
  filters = [], dates, actions, onRowClick, pageSize: initialSize = 8, defaultSort, empty, toolbar, caption, dense,
}) {
  const [q, setQ] = useState(initialQuery);
  const [f, setF] = useState({});
  const [range, setRange] = useState({ from: "", to: "" });
  const [sort, setSort] = useState(defaultSort || null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(initialSize);
  useEffect(() => setQ(initialQuery), [initialQuery]);
  useEffect(() => setPage(0), [q, f, range, sort, size]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = (rows || []).filter((r) => {
      if (needle) { const hay = (searchText ? searchText(r) : Object.values(r).filter((v) => typeof v === "string").join(" ")).toLowerCase(); if (!hay.includes(needle)) return false; }
      for (const fl of filters) if (f[fl.id] && String(fl.get(r)) !== f[fl.id]) return false;
      if (dates && (range.from || range.to)) { const d = toInputDate(dates.get(r)); if ((range.from && d < range.from) || (range.to && d > range.to)) return false; }
      return true;
    });
    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sort) list = [...list].sort((a, b) => { const x = col.sort(a), y = col.sort(b); return (x > y ? 1 : x < y ? -1 : 0) * (sort.dir === "asc" ? 1 : -1); });
    }
    return list;
  }, [rows, q, f, range, sort, filters, dates, columns, searchText]);

  const active = !!q || Object.values(f).some(Boolean) || range.from || range.to;
  const reset = () => { setQ(""); setF({}); setRange({ from: "", to: "" }); };
  const pageRows = filtered.slice(page * size, (page + 1) * size);
  const toggleSort = (c) => setSort((s) => (s?.key === c.key ? (s.dir === "asc" ? { key: c.key, dir: "desc" } : null) : { key: c.key, dir: "asc" }));

  if (error) return <div className="card"><ErrorState error={error} onRetry={onRetry} /></div>;

  return (
    <div className="dt card card-flush">
      <div className="dt-toolbar">
        <SearchInput value={q} onChange={setQ} placeholder={searchPlaceholder} className="dt-search" />
        <div className="dt-filters">
          {filters.map((fl) => (
            <label key={fl.id} className="dt-filter"><span className="sr-only">{fl.label}</span>
              <select value={f[fl.id] || ""} onChange={(e) => setF({ ...f, [fl.id]: e.target.value })} className={f[fl.id] ? "on" : ""}>
                <option value="">{fl.label}</option>
                {fl.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          ))}
          {dates && (
            <div className="dt-dates" role="group" aria-label={dates.label}>
              <input type="date" aria-label={`${dates.label} — du`} value={range.from} max={range.to || undefined} onChange={(e) => setRange({ ...range, from: e.target.value })} />
              <span aria-hidden>→</span>
              <input type="date" aria-label={`${dates.label} — au`} value={range.to} min={range.from || undefined} onChange={(e) => setRange({ ...range, to: e.target.value })} />
            </div>
          )}
          {active && <Button variant="ghost" size="sm" icon={FilterX} onClick={reset}>Réinitialiser</Button>}
        </div>
        {toolbar}
      </div>

      <div className="dt-scroll">
        <table className={`dt-table${dense ? " dense" : ""}${onRowClick ? " clickable" : ""}`}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" style={{ width: c.width, textAlign: c.align }} aria-sort={sort?.key === c.key ? (sort.dir === "asc" ? "ascending" : "descending") : undefined} className={c.hideMobile ? "hide-m" : ""}>
                  {c.sort ? (
                    <button className="th-sort" onClick={() => toggleSort(c)}>{c.header}{sort?.key === c.key ? (sort.dir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />) : <ChevronsUpDown size={13} className="idle" />}</button>
                  ) : c.header}
                </th>
              ))}
              {actions && <th scope="col" className="th-actions"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: 6 }, (_, i) => (
              <tr key={i} className="sk-row">{columns.map((c) => <td key={c.key} className={c.hideMobile ? "hide-m" : ""}><Skeleton w={c.primary ? "70%" : `${50 + ((i * 17 + c.key.length * 7) % 40)}%`} /></td>)}{actions && <td />}</tr>
            ))}
            {!loading && pageRows.map((r, i) => (
              <tr key={r[rowKey]} style={{ "--i": i }} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {columns.map((c) => (
                  <td key={c.key} data-label={c.header} className={`${c.primary ? "is-primary" : ""} ${c.hideMobile ? "hide-m" : ""}`} style={{ textAlign: c.align }}>{c.render ? c.render(r) : r[c.key]}</td>
                ))}
                {actions && <td className="td-actions" onClick={(e) => e.stopPropagation()}><Menu items={actions(r)} label={`Actions pour ${r[rowKey]}`} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !filtered.length && (
          active ? <EmptyState icon={SearchX} title="Aucun résultat" description="Aucun élément ne correspond à votre recherche ou à vos filtres." action={<Button variant="secondary" onClick={reset}>Réinitialiser les filtres</Button>} />
            : (empty || <EmptyState title="Rien à afficher pour l'instant" description="Les éléments apparaîtront ici dès qu'ils seront créés." />)
        )}
      </div>

      {!loading && filtered.length > 0 && <Pagination page={page} pageSize={size} total={filtered.length} onPage={setPage} onPageSize={setSize} />}
    </div>
  );
}
