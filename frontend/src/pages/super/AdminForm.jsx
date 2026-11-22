
import { useEffect } from "react";
import { ArrowLeft, UserCog, KeyRound, Info } from "lucide-react";
import {
  PageHeader,
  FormSection,
  Field,
  Alert,
  PageSkeleton,
  ErrorState,
} from "../../components/ui";
import Button from "../../components/ui/Button";
import useAsync from "../../hooks/useAsync";
import useForm, { rules } from "../../hooks/useForm";
import { useNavigate, useParams, Link } from "../../lib/router";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { getAdmin, saveAdmin } from "../../services/api";
import { listAgencies as listAuthAgencies } from "../../services/auth";

export default function AdminForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { token } = useAuth();
  const edit = !!id;

  const {
    data: current,
    error,
    reload,
  } = useAsync(
    () => (edit ? getAdmin(id, token) : Promise.resolve(null)),
    [id, token]
  );

  const {
    data: agencyData,
    error: agencyError,
    reload: reloadAgencies,
  } = useAsync(
    () => (token ? listAuthAgencies(token) : Promise.resolve([])),
    [token]
  );

  const agencies = (agencyData || []).map((agency) => ({
    value: agency.id,
    label: `${agency.nom_agence} - ${agency.ville}`,
  }));

  const schema = {
    nom: [rules.required("Saisissez le nom.")],
    prenom: [rules.required("Saisissez le prénom.")],
    email: [
      rules.required("Saisissez l'adresse e-mail."),
      rules.email(),
    ],
    agence_id: [
      rules.required("Choisissez l'agence de rattachement."),
    ],
    ...(!edit
      ? {
          password: [
            rules.required("Définissez un mot de passe provisoire."),
            rules.min(8, "8 caractères minimum."),
          ],
        }
      : {}),
  };

  const form = useForm(
    {
      nom: "",
      prenom: "",
      email: "",
      telephone: "",
      agence_id: "",
      password: "",
    },
    schema
  );

  useEffect(() => {
    if (current) {
      form.setValues({
        prenom: current.firstName || "",
        nom: current.lastName || "",
        email: current.email || "",
        telephone: current.phone || "",
        agence_id: current.agencyId || "",
        password: "",
      });
    }
  }, [current]);

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  if (agencyError) {
    return <ErrorState error={agencyError} onRetry={reloadAgencies} />;
  }

  if (edit && !current) {
    return <PageSkeleton />;
  }

  const submit = form.submit(async (v) => {
    await saveAdmin(v, id, token);

    toast.success(
      edit ? "Administrateur modifié" : "Administrateur créé",
      `${v.prenom} ${v.nom}`
    );

    navigate("/super/admins");
  });

  return (
    <>
      <PageHeader
        back={
          <Link to="/super/admins" className="back-link">
            <ArrowLeft size={15} />
            Administrateurs
          </Link>
        }
        title={edit ? "Modifier l'administrateur" : "Nouvel administrateur"}
        description="L'administrateur n'aura accès qu'aux données de l'agence choisie."
      />

      <form
        onSubmit={submit}
        noValidate
        ref={form.root}
        style={{ maxWidth: 820 }}
      >
        <FormSection
          icon={UserCog}
          title="Informations personnelles"
          description="Identité et coordonnées de contact."
        >
          <Field
            label="Nom"
            placeholder="Nom"
            required
            {...form.field("nom")}
          />

          <Field
            label="Prénom"
            placeholder="Prénom"
            required
            {...form.field("prenom")}
          />

          <Field
            label="Adresse e-mail"
            type="email"
            placeholder="prenom.nom@colistrack.ma"
            required
            {...form.field("email")}
          />

          <Field
            label="Téléphone"
            type="tel"
            placeholder="06 12 34 56 78"
            {...form.field("telephone")}
          />
        </FormSection>

        <FormSection
          icon={KeyRound}
          title="Agence et accès"
          description="Le rattachement détermine le périmètre de données visible."
        >
          <Field
            className="span-2"
            as="select"
            label="Agence de rattachement"
            placeholder="Choisir une agence"
            options={agencies}
            required
            {...form.field("agence_id")}
          />

          {!edit ? (
            <Field
              className="span-2"
              label="Mot de passe provisoire"
              type="password"
              hint="L'administrateur devra le modifier à sa première connexion."
              required
              {...form.field("password")}
            />
          ) : (
            <Field
              className="span-2"
              label="Nouveau mot de passe"
              type="password"
              placeholder="Laisser vide pour conserver le mot de passe actuel"
              hint="8 caractères minimum. Laissez vide si vous ne souhaitez pas le modifier."
              {...form.field("password")}
            />
          )}
        </FormSection>

        <div className="form-actions">
          <Button variant="secondary" to="/super/admins">
            Annuler
          </Button>

          <Button type="submit" loading={form.submitting}>
            {edit
              ? "Enregistrer les modifications"
              : "Créer l'administrateur"}
          </Button>
        </div>
      </form>
    </>
  );
}
