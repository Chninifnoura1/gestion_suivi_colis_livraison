import { Plus, Pencil } from "lucide-react";
import { PageHeader, Person } from "../../components/ui";
import Button from "../../components/ui/Button";
import DataTable from "../../components/data/DataTable";
import useAsync from "../../hooks/useAsync";
import { useNavigate } from "../../lib/router";
import { listAdmins } from "../../services/api";
import { fmtDate } from "../../lib/format";
import { useAuth } from "../../context/AuthContext";

export default function Admins() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { data, loading, error, reload } = useAsync(
  () => listAdmins(null, token),
  [token]
);
  const agencies = [...new Set((data || []).map((a) => a.agency))].map((x) => ({ value: x, label: x }));
  const cols = [
    { key: "name", header: "Administrateur", primary: true, sort: (a) => a.name, render: (a) => <Person name={a.name} sub={a.email} /> },
    { key: "agency", header: "Agence", sort: (a) => a.agency }, { key: "phone", header: "Téléphone", hideMobile: true },
    { key: "createdAt", header: "Créé le", sort: (a) => a.createdAt, render: (a) => fmtDate(a.createdAt), hideMobile: true },
  ];
  return (
    <>
      <PageHeader title="Administrateurs" description="Chaque administrateur gère une seule agence." actions={<Button to="/super/admins/nouveau" icon={Plus}>Nouvel administrateur</Button>} />
      <DataTable
        columns={cols}
        rows={data}
        loading={loading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Rechercher un administrateur…"
        caption="Liste des administrateurs"
        searchText={(a) => `${a.name} ${a.email} ${a.agency}`}
        filters={[
          {
            id: "agency",
            label: "Toutes les agences",
            options: agencies,
            get: (a) => a.agency,
          },
        ]}
        actions={(a) => [
          {
            label: "Modifier",
            icon: Pencil,
            onClick: () => navigate(`/super/admins/${a.id}/modifier`),
          },
        ]}
      />
      </>
  );
}
