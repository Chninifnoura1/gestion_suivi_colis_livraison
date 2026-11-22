
import { useEffect } from "react";
import { ArrowLeft, UserRound, KeyRound, Briefcase } from "lucide-react";
import {
  PageHeader,
  FormSection,
  Field,
  PageSkeleton,
  ErrorState,
  Avatar,
  Checkbox,
} from "../../components/ui";
import Button from "../../components/ui/Button";
import useAsync from "../../hooks/useAsync";
import useForm, { rules } from "../../hooks/useForm";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useNavigate, useParams, Link } from "../../lib/router";
import { getCourier, saveCourier } from "../../services/api";

export default function CourierForm() {
  const { id } = useParams();
  const edit = !!id;
  const { user, token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const {
    data: c,
    error,
    reload,
  } = useAsync(
    () => (edit ? getCourier(user, id, token) : Promise.resolve(null)),
    [id, token]
  );

  const schema = {
    lastName: [rules.required("Saisissez le nom.")],
    firstName: [rules.required("Saisissez le prénom.")],
    email: [
      rules.required("Saisissez l'e-mail."),
      rules.email(),
    ],
    phone: [
      rules.required("Saisissez le téléphone."),
      rules.phone(),
    ],
    ...(!edit
      ? {
          password: [
            rules.required("Définissez un mot de passe initial."),
            rules.min(8, "8 caractères minimum."),
          ],
          confirm: [
            rules.required("Confirmez le mot de passe."),
            rules.match(
              "password",
              "Les deux mots de passe ne correspondent pas."
            ),
          ],
        }
      : {}),
  };

  const form = useForm(
    {
      lastName: "",
      firstName: "",
      email: "",
      phone: "",
      password: "",
      confirm: "",
      available: "Disponible",
      active: "Actif",
      peut_transport: false,
      peut_livrer_client: true,
    },
    schema
  );

  useEffect(() => {
    if (c) {
      form.setValues({
        lastName: c.lastName || "",
        firstName: c.firstName || "",
        email: c.email || "",
        phone: c.phone || "",
        password: "",
        confirm: "",
        available: c.available ? "Disponible" : "Indisponible",
        active: c.active ? "Actif" : "Inactif",
        peut_transport: Boolean(c.peutTransport),
        peut_livrer_client: Boolean(c.peutLivrerClient),
      });
    }
  }, [c]);

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  if (edit && !c) {
    return <PageSkeleton />;
  }

  const f = form.field;
  const name = `${form.values.firstName} ${form.values.lastName}`.trim();

  const submit = form.submit(async (v) => {
    const res = await saveCourier(user, v, id, token);

    toast.success(
      edit ? "Livreur modifié" : "Livreur ajouté",
      `${v.firstName} ${v.lastName}`
    );

    navigate(edit ? `/admin/livreurs/${id}` : "/admin/livreurs");
  });

  return (
    <>
      <PageHeader
        back={
          <Link
            to={edit ? `/admin/livreurs/${id}` : "/admin/livreurs"}
            className="back-link"
          >
            <ArrowLeft size={15} />
            {edit ? c.name : "Livreurs"}
          </Link>
        }
        title={edit ? "Modifier le livreur" : "Ajouter un livreur"}
        description={
          edit
            ? "Mettez à jour les informations du livreur."
            : "Créez le compte d'un livreur de votre agence. Un matricule est généré automatiquement."
        }
      />

      <form
        onSubmit={submit}
        noValidate
        ref={form.root}
        style={{ maxWidth: 820 }}
      >
        <FormSection
          icon={UserRound}
          title="Informations personnelles"
        >
          <div className="span-2 row">
            <Avatar name={name || "?"} size="lg" />
          </div>

          <Field
            label="Nom"
            required
            {...f("lastName")}
          />

          <Field
            label="Prénom"
            required
            {...f("firstName")}
          />

          <Field
            label="Adresse e-mail"
            type="email"
            required
            {...f("email")}
          />

          <Field
            label="Téléphone"
            type="tel"
            placeholder="06 12 34 56 78"
            required
            {...f("phone")}
          />
        </FormSection>

       {!edit && (
          <FormSection
            icon={KeyRound}
            title="Compte"
            description="L'adresse e-mail sera utilisée pour se connecter."
          >
            <Field
              label="Mot de passe initial"
              type="password"
              autoComplete="new-password"
              required
              {...f("password")}
            />

            <Field
              label="Confirmation du mot de passe"
              type="password"
              autoComplete="new-password"
              required
              {...f("confirm")}
            />
          </FormSection>
        )}

        <FormSection
          icon={Briefcase}
          title="Professionnel"
        >
          <Field
            as="select"
            label="Disponibilité"
            options={["Disponible", "Indisponible"]}
            {...f("available")}
          />

          <Field
            as="select"
            label="Statut du compte"
            options={["Actif", "Inactif"]}
            {...f("active")}
          />

          {edit && (
            <div className="span-2">
              <h4>Autorisations du livreur</h4>

              <Checkbox
                label="Transporter les colis entre les agences"
                checked={form.values.peut_transport}
                {...f("peut_transport")}
              />

              <Checkbox
                label="Effectuer les livraisons chez les clients"
                checked={form.values.peut_livrer_client}
                {...f("peut_livrer_client")}
              />
            </div>
          )}
        </FormSection>

        <div className="form-actions">
          <Button
            variant="secondary"
            to={edit ? `/admin/livreurs/${id}` : "/admin/livreurs"}
          >
            Annuler
          </Button>

          <Button type="submit" loading={form.submitting}>
            {edit ? "Enregistrer les modifications" : "Ajouter le livreur"}
          </Button>
        </div>
      </form>
    </>
  );
}
