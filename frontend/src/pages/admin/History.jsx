import { useState } from "react";
import { ArrowRight, Rows3, GitCommitVertical } from "lucide-react";
import { PageHeader, Card, Tabs, SearchInput, EmptyState, Skeleton, ErrorState } from "../../components/ui";
import Button from "../../components/ui/Button";
import DataTable from "../../components/data/DataTable";
import { StatusBadge } from "../../components/domain/StatusBadge";
import { STATUS_ICON } from "../../components/domain/Timeline";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { listHistory } from "../../services/api";
import { STATUS } from "../../lib/constants";
import { fmtDateTime, fmtLongDate, fmtTime, toInputDate } from "../../lib/format";

export default function History() {
  const { user, token } = useAuth(), [tab, setTab] = useState("flow"), [q, setQ] = useState(""), [limit, setLimit] = useState(30);
  const { data, loading, error, reload } = useAsync(() => listHistory(user, token), []);
  if (error) return <ErrorState error={error} onRetry={reload} />;
  const filtered = (data || []).filter((h) => `${h.parcelId} ${h.by} ${h.note}`.toLowerCase().includes(q.toLowerCase()));
  const days = filtered.slice(0, limit).reduce((m, h) => { const k = toInputDate(h.at); (m[k] = m[k] || []).push(h); return m; }, {});
  return (
    <>
      <PageHeader title="Historique des statuts" description="Chaque changement de statut est conservé : aucune opération n'est écrasée." />
      <div className="stack">
        <div className="row row-between"><Tabs variant="pills" value={tab} onChange={setTab} items={[{ id: "flow", label: "Chronologie", icon: GitCommitVertical }, { id: "table", label: "Tableau", icon: Rows3 }]} />
          {tab === "flow" && <SearchInput value={q} onChange={setQ} placeholder="Filtrer par colis, utilisateur…" className="dt-search" />}</div>
        {tab === "table" ? (
          <DataTable rows={data} loading={loading} caption="Historique des statuts" pageSize={12} searchPlaceholder="Rechercher un colis, un utilisateur…" searchText={(h) => `${h.parcelId} ${h.by} ${h.note}`}
            filters={[{ id: "to", label: "Tous les nouveaux statuts", options: Object.entries(STATUS).map(([v, s]) => ({ value: v, label: s.label })), get: (h) => h.to }]} dates={{ label: "Date", get: (h) => h.at }}
            columns={[
              { key: "parcelId", header: "N° de suivi", primary: true, sort: (h) => h.parcelId, render: (h) => <span className="code-link">{h.parcelId}</span> },
              { key: "from", header: "Ancien statut", render: (h) => (h.from ? <StatusBadge status={h.from} /> : <span className="muted">—</span>) }, { key: "to", header: "Nouveau statut", render: (h) => <StatusBadge status={h.to} /> },
              { key: "at", header: "Date", sort: (h) => h.at, render: (h) => fmtDateTime(h.at) }, { key: "by", header: "Utilisateur", sort: (h) => h.by }, { key: "note", header: "Remarque", render: (h) => h.note || "—", hideMobile: true },
            ]} defaultSort={{ key: "at", dir: "desc" }} />
        ) : loading ? <Card>{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} h={40} style={{ marginBottom: 14 }} />)}</Card> : !filtered.length ? <Card><EmptyState title="Aucun événement" description="Aucune opération ne correspond à votre recherche." /></Card> : (
          <>
            {Object.entries(days).map(([day, items]) => (
              <Card key={day} className="feed-day">
                <h3>{fmtLongDate(day)}</h3>
                <div className="feed">
                  {items.map((h) => { const s = STATUS[h.to], I = STATUS_ICON[h.to]; return (
                    <div className="feed-item" key={h.id}>
                      <span className="feed-time tabular">{fmtTime(h.at)}</span>
                      <span className={`feed-dot tone-${s.tone}`}><I size={14} /></span>
                      <div className="feed-body"><div className="feed-line"><strong>{h.parcelId}</strong>{h.from && <><StatusBadge status={h.from} /><ArrowRight size={14} className="arrow" /></>}<StatusBadge status={h.to} /></div><small>{h.by}{h.note ? ` — ${h.note}` : ""}</small></div>
                    </div>); })}
                </div>
              </Card>
            ))}
            {filtered.length > limit && <div style={{ textAlign: "center" }}><Button variant="secondary" onClick={() => setLimit(limit + 30)}>Afficher plus d'événements</Button></div>}
          </>
        )}
      </div>
    </>
  );
}
