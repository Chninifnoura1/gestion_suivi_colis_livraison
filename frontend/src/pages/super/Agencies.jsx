
import { useState } from "react";
import { Plus, Eye, Pencil } from "lucide-react";
import { PageHeader, Person, Modal, Field } from "../../components/ui";
import Button from "../../components/ui/Button";
import DataTable from "../../components/data/DataTable";
import { Rate } from "../../components/domain/Cells";
import useAsync from "../../hooks/useAsync";
import useForm, { rules } from "../../hooks/useForm";
import { useNavigate, useQuery } from "../../lib/router";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { listAgencies, saveAgency } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const schema = {
  name: [rules.required("Donnez un nom à l'agence.")],
  city: [rules.required("Indiquez la ville.")],
  address: [rules.required("Indiquez l'adresse.")],
  phone: [
    rules.required("Indiquez un téléphone."),
    rules.phone(),
  ],
};

export function AgencyModal({ open, agency, onClose, onSaved }) {
  const toast = useToast();
  const { token } = useAuth();

  const form = useForm(
    {
      name: agency?.name || "",
      city: agency?.city || "",
      address: agency?.address || "",
      phone: agency?.phone || "",
    },
    schema
  );

  const submit = form.submit(async (v) => {
    try {
      await saveAgency(v, agency?.id, token);

      toast.success(
        agency ? "Agence modifiée" : "Agence créée",
        v.name
      );

      onSaved();
      onClose();
    } catch (error) {
      toast.error(
        agency ? "Erreur de modification" : "Erreur de création",
        error.message || "Impossible d'enregistrer cette agence."
      );
    }
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={agency ? "Modifier l'agence" : "Nouvelle agence"}
      description="Ces informations sont visibles par l'administrateur de l'agence."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button loading={form.submitting} onClick={submit}>
            {agency
              ? "Enregistrer les modifications"
              : "Créer l'agence"}
          </Button>
        </>
      }
    >
      <form
        className="form-grid"
        onSubmit={submit}
        noValidate
        ref={form.root}
      >
        <Field
          className="span-2"
          label="Nom de l'agence"
          placeholder="Agence Oujda"
          required
          {...form.field("name")}
        />

        <Field
          label="Ville"
          placeholder="Oujda"
          required
          {...form.field("city")}
        />

        <Field
          label="Téléphone"
          type="tel"
          placeholder="05 36 00 00 00"
          required
          {...form.field("phone")}
        />

        <Field
          className="span-2"
          label="Adresse"
          placeholder="Boulevard Mohammed V"
          required
          {...form.field("address")}
        />

        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

export default function Agencies() {
  const { q } = useQuery();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { token } = useAuth();

  const { data, loading, error, reload } = useAsync(
    () => listAgencies(null, token),
    [token]
  );

  const [edit, setEdit] = useState(null);

  const cols = [
    {
      key: "name",
      header: "Agence",
      primary: true,
      sort: (a) => a.name,
      render: (a) => <Person name={a.name} sub={a.city} />,
    },
    {
      key: "admin",
      header: "Responsable",
      render: (a) =>
        a.admin || <span className="muted">Non assigné</span>,
      hideMobile: true,
    },
    {
      key: "users",
      header: "Utilisateurs",
      sort: (a) => a.users,
      align: "right",
    },
    {
      key: "parcels",
      header: "Colis",
      sort: (a) => a.parcels,
      align: "right",
    },
    {
      key: "rate",
      header: "Taux de réussite",
      sort: (a) => a.rate,
      render: (a) => <Rate value={a.rate} />,
    },
  ];

  return (
    <>
      <PageHeader
        title="Agences"
        description="Créez, modifiez et suivez les agences du réseau."
        actions={
          <Button icon={Plus} onClick={() => setEdit({})}>
            Nouvelle agence
          </Button>
        }
      />

      <DataTable
        columns={cols}
        rows={data}
        loading={loading}
        error={error}
        onRetry={reload}
        searchPlaceholder="Rechercher une agence, une ville…"
        initialQuery={q || ""}
        caption="Liste des agences"
        searchText={(a) =>
          `${a.name} ${a.city} ${a.admin || ""}`
        }
        onRowClick={(a) =>
          navigate(`/super/agences/${a.id}`)
        }
    actions={(a) => [
      {
        label: "Voir les détails",
        icon: Eye,
        onClick: () => navigate(`/super/agences/${a.id}`),
      },
      {
        label: "Modifier",
        icon: Pencil,
        onClick: () => setEdit(a),
      },
    ]}
      />

      {edit && (
        <AgencyModal
          open
          agency={edit.id ? edit : null}
          onClose={() => setEdit(null)}
          onSaved={() => reload(true)}
        />
      )}
    </>
  );
}
