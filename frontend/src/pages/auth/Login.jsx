
import { useState } from "react";
import {
  Building2,
  ShieldCheck,
  Truck,
  ArrowLeft,
  Info,
} from "lucide-react";

import Logo from "../../components/domain/Logo";
import RouteMap from "../../components/domain/RouteMap";
import { Field, Checkbox, Alert } from "../../components/ui";
import Button from "../../components/ui/Button";
import useForm, { rules } from "../../hooks/useForm";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useNavigate, useQuery, Link } from "../../lib/router";
import { ROLE_META } from "../../lib/constants";

const OPTIONS = [
  ["SUPER_ADMIN", "Super admin", ShieldCheck],
  ["ADMIN", "Administrateur", Building2],
  ["LIVREUR", "Livreur", Truck],
];

const schema = {
  email: [
    rules.required("Saisissez votre adresse e-mail."),
    rules.email(),
  ],
  password: [
    rules.required("Saisissez votre mot de passe."),
  ],
};

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { next } = useQuery();

  const [role, setRole] = useState("ADMIN");

  const form = useForm(
    {
      email: "",
      password: "",
      remember: true,
    },
    schema
  );

  const pick = (selectedRole) => {
    setRole(selectedRole);
  };

  const onSubmit = form.submit(async (values) => {
    try {
      const u = await login(
  	values.email.trim(),
  	values.password,
  	role
      );

      const userRole = ROLE_META[u.role];

      if (!userRole) {
        throw new Error("Rôle utilisateur non reconnu.");
      }

      const target =
        next && next.startsWith(userRole.base)
          ? next
          : userRole.base;

      toast.success(
        `Bienvenue, ${u.name.split(" ")[0]}`,
        "Connexion réussie."
      );

      navigate(target);
    } catch (error) {
      toast.error(
        "Échec de connexion",
        error.message ||
          "Vérifiez votre adresse e-mail et votre mot de passe."
      );
    }
  });

  return (
    <div className="login">
      <aside className="login-art">
        <Link to="/">
          <Logo inverse />
        </Link>

        <div>
          <h1>
            Chaque colis, de l'agence à la porte du destinataire.
          </h1>
          <p>
            Pilotez vos agences, vos livreurs et vos livraisons
            depuis un seul espace.
          </p>
        </div>

        <RouteMap />
      </aside>

      <main className="login-form" id="main">
        <form
          className="login-card"
          onSubmit={onSubmit}
          noValidate
          ref={form.root}
        >
          <div>
            <Link to="/" className="back-link">
              <ArrowLeft size={15} />
              Retour au suivi de colis
            </Link>

            <h2>Espace professionnel</h2>
            <p>
              Connectez-vous pour accéder à votre espace.
            </p>
          </div>

          <Alert
            tone="info"
            title="Authentification sécurisée"
          >
            <span>
              Choisissez votre profil puis connectez-vous avec
              vos identifiants professionnels. Votre rôle réel
              sera vérifié par le serveur.
            </span>
          </Alert>

          <div
            className="roles"
            role="radiogroup"
            aria-label="Profil de connexion"
          >
            {OPTIONS.map(([id, label, Ic]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={role === id}
                className={`role-opt${role === id ? " on" : ""}`}
                onClick={() => pick(id)}
              >
                <Ic size={20} />
                {label}
              </button>
            ))}
          </div>

          <Field
            label="Adresse e-mail"
            type="email"
            autoComplete="username"
            placeholder="vous@colistrack.ma"
            required
            {...form.field("email")}
          />

          <Field
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            placeholder="Votre mot de passe"
            required
            {...form.field("password")}
          />

          <div className="row row-between">
            <Checkbox
              label="Se souvenir de moi"
              {...form.field("remember")}
              checked={form.values.remember}
            />

            <button
              type="button"
              className="link-btn"
              onClick={() =>
                toast.info(
                  "Fonctionnalité non disponible",
                  "La réinitialisation du mot de passe sera ajoutée ultérieurement."
                )
              }
            >
              Mot de passe oublié ?
            </button>
          </div>

          <Button
            type="submit"
            size="lg"
            loading={form.submitting}
            full
          >
            Se connecter
          </Button>

          <p
            className="muted row"
            style={{
              gap: 8,
              fontSize: "var(--fs-xs)",
              flexWrap: "nowrap",
            }}
          >
            <Info size={14} style={{ flexShrink: 0 }} />
            Les clients n'ont pas de compte : ils suivent leur colis
            directement depuis la page d'accueil.
          </p>
        </form>
      </main>
    </div>
  );
}
