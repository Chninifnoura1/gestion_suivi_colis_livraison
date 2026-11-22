
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Send,
  Inbox,
  Box,
  ArrowRight,
  Info,
} from "lucide-react";

import {
  PageHeader,
  FormSection,
  Field,
  Card,
  CardHeader,
  PageSkeleton,
  ErrorState,
} from "../../components/ui";

import Button from "../../components/ui/Button";
import useAsync from "../../hooks/useAsync";
import useForm, { rules } from "../../hooks/useForm";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useNavigate, useParams, Link } from "../../lib/router";
import {
  getParcel,
  saveParcel,
  updateParcelStatus,
  getAgencyOfUser,
} from "../../services/api";
import { listActiveAgencyCities } from "../../services/auth";

const R = rules.required;
const P = rules.positive("Valeur supérieure à 0.");

const SECTIONS = [
  {
    id: "sender",
    title: "Expéditeur",
    fields: ["senderName", "senderPhone", "senderAddress", "senderCity"],
  },
  {
    id: "recipient",
    title: "Destinataire",
    fields: [
      "recipientName",
      "recipientPhone",
      "recipientAddress",
      "recipientCity",
    ],
  },
  {
    id: "parcel",
    title: "Colis",
    fields: ["content", "weight", "status"],
  },
];

export default function ParcelForm() {
  const { id } = useParams();
  const edit = !!id;

  const { user, token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const agency = getAgencyOfUser(user);

  const [cities, setCities] = useState([]);

  const senderCities = agency?.city ? [agency.city] : [];

  const recipientCities = cities.filter(
    (city) =>
      city.trim().toLowerCase() !==
      (agency?.city || "").trim().toLowerCase()
  );

useEffect(() => {
  let cancelled = false;

  if (!token) return;

  listActiveAgencyCities(token)
    .then((data) => {
      if (!cancelled) {
        setCities(Array.isArray(data) ? data : []);
      }
    })
    .catch((error) => {
      console.error("Erreur chargement des villes:", error);
    });

  return () => {
    cancelled = true;
  };
}, [token]);

  const {
    data: p,
    error,
    reload,
  } = useAsync(
    () => (edit ? getParcel(user, id, token) : Promise.resolve(null)),
    [id, token]
  );

  const schema = {
    senderName: [R("Saisissez le nom de l'expéditeur.")],
    senderPhone: [R("Saisissez son téléphone."), rules.phone()],
    senderAddress: [R("Saisissez son adresse.")],
    senderCity: [R("Choisissez la ville.")],

    recipientName: [R("Saisissez le nom du destinataire.")],
    recipientPhone: [R("Saisissez son téléphone."), rules.phone()],
    recipientEmail: [rules.email()],
    recipientAddress: [R("Saisissez l'adresse de livraison.")],
    recipientCity: [R("Choisissez une ville.")],

    content: [R("Décrivez le contenu du colis.")],
    weight: [R("Indiquez le poids."), P],
  };

  const form = useForm(
    {
      senderName: "",
      senderPhone: "",
      senderAddress: "",
      senderCity: agency?.city || "",

      recipientName: "",
      recipientPhone: "",
      recipientEmail: "",
      recipientAddress: "",
      recipientCity: "",

      content: "",
      weight: "",
      status: "CREE",
    },
    schema
  );

  useEffect(() => {
    if (!p) return;

    form.setValues({
      senderName: p.sender.name,
      senderPhone: p.sender.phone,
      senderAddress: p.sender.address,
      senderCity: p.sender.city,

      recipientName: p.recipient.name,
      recipientPhone: p.recipient.phone,
      recipientEmail: p.recipient.email || "",
      recipientAddress: p.recipient.address,
      recipientCity: p.recipient.city,

      content: p.content,
      weight: p.weight,
      status: p.status || "CREE",
    });
  }, [p]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  if (edit && !p) {
    return <PageSkeleton />;
  }

  const v = form.values;
  const f = form.field;
  const sections = SECTIONS;

  const done = (section) =>
    section.fields.every(
      (key) =>
        String(v[key] ?? "").trim() && !form.errors[key]
    );

const submit = form.submit(async (vals) => {
  const res = await saveParcel(user, vals, id, token);

  if (edit && vals.status !== p.status) {
    await updateParcelStatus(id, vals.status, token);
  }

  toast.success(
    edit ? "Colis modifié" : "Colis enregistré",
    res.id
  );

  navigate(`/admin/colis/${res.id}`);
});

  const go = (sid) => {
    document
      .getElementById(`sec-${sid}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <PageHeader
        back={
          <Link
            to={edit ? `/admin/colis/${id}` : "/admin/colis"}
            className="back-link"
          >
            <ArrowLeft size={15} />
            {edit ? id : "Gestion des colis"}
          </Link>
        }
        title={edit ? `Modifier le colis ${id}` : "Ajouter un colis"}
        description={
          edit
            ? "Modifiez les informations du colis et son statut."
            : "Renseignez les informations dans les trois sections. Les champs marqués * sont obligatoires."
        }
      />

      <form
        onSubmit={submit}
        noValidate
        ref={form.root}
        className="form-layout"
      >
        <div>
          {/* SECTION 1 : EXPÉDITEUR */}
          <FormSection
            id="sec-sender"
            icon={Send}
            title="Expéditeur"
            description="La personne qui envoie le colis."
          >
            <Field
              label="Nom complet"
              placeholder="Ahmed Benali"
              required
              {...f("senderName")}
            />

            <Field
              label="Téléphone"
              type="tel"
              placeholder="06 12 34 56 78"
              required
              {...f("senderPhone")}
            />

            <Field
              as="select"
              label="Ville"
              placeholder="Choisir une ville"
              options={senderCities}
              required
              {...f("senderCity")}
            />

            <Field
              className="span-2"
              label="Adresse complète"
              placeholder="Numéro, rue, quartier"
              required
              {...f("senderAddress")}
            />
          </FormSection>

          {/* SECTION 2 : DESTINATAIRE */}
          <FormSection
            id="sec-recipient"
            icon={Inbox}
            title="Destinataire"
            description="La personne qui recevra le colis à domicile."
          >
            <Field
              label="Nom complet"
              placeholder="Sara Benali"
              required
              {...f("recipientName")}
            />

            <Field
              label="Téléphone"
              type="tel"
              placeholder="06 98 76 54 32"
              required
              {...f("recipientPhone")}
            />

            <Field
              label="E-mail (facultatif)"
              type="email"
              placeholder="sara@mail.ma"
              {...f("recipientEmail")}
            />

            <Field
              as="select"
              label="Ville"
              placeholder="Choisir une ville"
              options={recipientCities}
              required
              {...f("recipientCity")}
            />

            <Field
              className="span-2"
              label="Adresse complète"
              placeholder="Numéro, rue, quartier"
              required
              {...f("recipientAddress")}
            />
          </FormSection>

          {/* SECTION 3 : COLIS */}
          <FormSection
            id="sec-parcel"
            icon={Box}
            title="Colis"
            description="Contenu et poids du colis."
          >
            <Field
              className="span-2"
              as="textarea"
              rows={2}
              label="Description du contenu"
              placeholder="Ex. Vêtements, 3 articles"
              required
              {...f("content")}
            />

            <Field
              label="Poids"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              suffix="kg"
              placeholder="4,2"
              required
              {...f("weight")}
            />
            {edit && (
  <Field
    className="span-2"
    as="select"
    label="Statut du colis"
    options={[
      { value: "CREE", label: "Créé" },
      { value: "EN_ATTENTE", label: "En attente" },
      { value: "PRIS_EN_CHARGE", label: "Pris en charge" },
      { value: "EN_COURS", label: "En cours" },
      { value: "ECHEC", label: "Échec de livraison" },
      { value: "NOUVELLE_TENTATIVE", label: "Nouvelle tentative" },
    ]}
    {...f("status")}
  />
)}
          </FormSection>

          {/* BOUTONS */}
          <div className="form-actions">
            <Button
              variant="secondary"
              to={edit ? `/admin/colis/${id}` : "/admin/colis"}
            >
              Annuler
            </Button>

            <Button
              variant="ghost"
              onClick={() => form.reset()}
            >
              Réinitialiser
            </Button>

            <Button
              type="submit"
              loading={form.submitting}
              icon={Check}
            >
              {edit
                ? "Enregistrer les modifications"
                : "Enregistrer le colis"}
            </Button>
          </div>
        </div>

        {/* RÉCAPITULATIF */}
        <aside className="form-aside" aria-label="Récapitulatif">
          <Card>
            <CardHeader title="Récapitulatif" />

            <div className="summary-route">
              {agency.city || "…"}
              <ArrowRight size={18} />
              {v.recipientCity || "…"}
            </div>

            <p
              className="muted"
              style={{ fontSize: "var(--fs-sm)" }}
            >
              {v.weight
                ? `${v.weight} kg`
                : "Poids à renseigner"}
            </p>
          </Card>

          <Card>
            <CardHeader title="Sections complétées" />

            <div className="progress-list">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  className={done(section) ? "done" : ""}
                  onClick={() => go(section.id)}
                >
                  <span className="pl-dot">
                    {done(section) && (
                      <Check size={12} strokeWidth={3} />
                    )}
                  </span>
                  {section.title}
                </button>
              ))}
            </div>
          </Card>

          <p
            className="muted row"
            style={{
              gap: 8,
              fontSize: "var(--fs-xs)",
              flexWrap: "nowrap",
              alignItems: "flex-start",
            }}
          >
            <Info
              size={14}
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            Le numéro de suivi est généré automatiquement à l'enregistrement.
          </p>
        </aside>
      </form>
    </>
  );
}
