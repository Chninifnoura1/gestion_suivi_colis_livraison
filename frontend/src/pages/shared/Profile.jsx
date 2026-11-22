import { useEffect, useRef, useState } from "react";
import { PageHeader, Card, CardHeader, Tabs, Field, Avatar, Switch, Alert } from "../../components/ui";
import Button from "../../components/ui/Button";
import { AvailabilityBadge } from "../../components/domain/StatusBadge";
import useForm, { rules } from "../../hooks/useForm";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { Camera, LogOut, Mail, Phone, UserRound, Lock, SlidersHorizontal, Building2, MapPin } from "lucide-react";
import { ROLE_META } from "../../lib/constants";
import {
  getAgencyOfUser,
  setAvailability,
  getCourierCities,
  updateCourierCurrentCity,
   updateMyProfile,
  changeMyPassword,
} from "../../services/api";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));


function Identity() {
  const { user, token, updateUser } = useAuth();
  const toast = useToast();
  const file = useRef(null);
  const [error, setError] = useState("");

  const form = useForm(
    {
      first: user.firstName || "",
      last: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
      matricule: user.matricule || "",
    },
    {
      first: [rules.required("Saisissez votre prénom.")],
      last: [rules.required("Saisissez votre nom.")],
      email: [
        rules.required("Saisissez votre e-mail."),
        rules.email(),
      ],
      phone: [rules.phone()],
    }
  );

  const submit = form.submit(async (values) => {
    setError("");

    try {
      const updatedUser = await updateMyProfile(
        {
          prenom: values.first,
          nom: values.last,
          email: values.email,
          telephone: values.phone,
          matricule: values.matricule,
        },
        token
      );

      updateUser(updatedUser);

      toast.success(
        "Profil mis à jour",
        "Vos informations ont été enregistrées."
      );
    } catch (err) {
      setError(
        err.message || "Impossible d'enregistrer votre profil."
      );
    }
  });

  return (
    <Card>
      {user.role !== "SUPER_ADMIN" && (
        <div className="profile-head">
          <Avatar name={user.name} size="xl" tone="blue" />
          <div>
            <h2>{user.name}</h2>
            <p>{ROLE_META[user.role].label}</p>
            <input
              ref={file}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) =>
                e.target.files[0] &&
                toast.info(
                  "Photo sélectionnée",
                  `${e.target.files[0].name} — l'envoi sera branché à l'API.`
                )
              }
            />
            <Button
              variant="secondary"
              size="sm"
              icon={Camera}
              onClick={() => file.current.click()}
              className="mt"
            >
              Changer la photo
            </Button>
          </div>
        </div>
      )}

      <form
        className="form-grid"
        onSubmit={submit}
        noValidate
        ref={form.root}
      >
        <Field
          label="Prénom"
          required
          icon={UserRound}
          {...form.field("first")}
        />
        <Field
          label="Nom"
          required
          {...form.field("last")}
        />
        <Field
          label="Adresse e-mail"
          type="email"
          required
          icon={Mail}
          {...form.field("email")}
        />
        <Field
          label="Téléphone"
          type="tel"
          icon={Phone}
          placeholder="06 12 34 56 78"
          {...form.field("phone")}
        />
        {user.role !== "SUPER_ADMIN" && (
          <Field
            className="span-2"
            label="Matricule"
            placeholder="Votre matricule"
            {...form.field("matricule")}
          />
        )}

        {error && (
          <p
            className="span-2"
            style={{ color: "#dc2626", margin: 0 }}
          >
            {error}
          </p>
        )}

        <div className="span-2 form-actions" style={{ padding: 0 }}>
          <Button type="submit" loading={form.submitting}>
            Enregistrer les modifications
          </Button>
        </div>
      </form>
    </Card>
  );
}


function Security() {
  const { token } = useAuth();
  const toast = useToast();
  const [error, setError] = useState("");

  const form = useForm(
    { old: "", next: "", confirm: "" },
    {
      old: [rules.required("Saisissez votre mot de passe actuel.")],
      next: [
        rules.required("Choisissez un nouveau mot de passe."),
        rules.min(8, "8 caractères minimum."),
      ],
      confirm: [
        rules.required("Confirmez le nouveau mot de passe."),
        rules.match("next", "Les deux mots de passe ne correspondent pas."),
      ],
    }
  );

  const submit = form.submit(async (values) => {
    setError("");

    try {
      await changeMyPassword(values, token);
      form.reset();
      toast.success(
        "Mot de passe modifié",
        "Utilisez-le à votre prochaine connexion."
      );
    } catch (err) {
      setError(
        err.message || "Impossible de modifier le mot de passe."
      );
    }
  });

  return (
    <Card style={{ maxWidth: 560 }}>
      <CardHeader
        icon={Lock}
        title="Modifier le mot de passe"
        subtitle="Choisissez un mot de passe d'au moins 8 caractères."
      />

      <form className="stack-sm" onSubmit={submit} noValidate ref={form.root}>
        {error && <Alert variant="error">{error}</Alert>}

        <Field
          label="Mot de passe actuel"
          type="password"
          autoComplete="current-password"
          required
          {...form.field("old")}
        />

        <Field
          label="Nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          required
          {...form.field("next")}
        />

        <Field
          label="Confirmer le nouveau mot de passe"
          type="password"
          autoComplete="new-password"
          required
          {...form.field("confirm")}
        />

        <div>
          <Button type="submit" loading={form.submitting}>
            Mettre à jour le mot de passe
          </Button>
        </div>
      </form>
    </Card>
  );
}

function Preferences() {
  const { theme, setTheme } = useTheme(), toast = useToast();
  const [prefs, setPrefs] = useState({ all: true, email: true, incidents: true });
  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <Card>
        <CardHeader title="Thème d'affichage" subtitle="Le mode sombre dispose de sa propre palette, pensée pour réduire la fatigue visuelle." />
        <div className="theme-opts" role="radiogroup" aria-label="Thème">
          {[["light", "Clair"], ["dark", "Sombre"], ["system", "Automatique"]].map(([id, label]) => (
            <button key={id} role="radio" aria-checked={theme === id} className={`theme-opt${theme === id ? " on" : ""}`} onClick={() => setTheme(id)}>
              <span className={`theme-prev ${id}`}><i /><b /></span>{label}
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="Notifications" subtitle="Choisissez ce que vous souhaitez recevoir." />
        {[["all", "Notifications dans l'application", "Affectations, changements de statut, messages."], ["email", "Récapitulatif par e-mail", "Un résumé quotidien de l'activité."], ["incidents", "Alertes d'incident", "Échecs de livraison et retards."]].map(([k, t, d]) => (
          <div className="setting-row" key={k}><div><strong>{t}</strong><p>{d}</p></div><Switch label={t} checked={prefs[k]} onChange={(v) => { setPrefs({ ...prefs, [k]: v }); toast.success("Préférence enregistrée"); }} /></div>
        ))}
      </Card>
      <Card>
        <CardHeader title="Langue" />
        <Field as="select" label="Langue de l'interface" options={["Français"]} hint="Seul le français est disponible pour le moment." defaultValue="Français" />
      </Card>
    </div>
  );
}

function Availability() {
  const { user, token, updateUser } = useAuth();
  const toast = useToast();
  const [on, setOn] = useState(Boolean(user.available));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const change = async (v) => {
    setBusy(true);
    setError("");

    try {
      const updatedUser = await setAvailability(user, v, token);
      updateUser(updatedUser);
      setOn(Boolean(updatedUser.disponible));

      toast.success(
        v ? "Vous êtes disponible" : "Vous êtes indisponible"
      );
    } catch (err) {
      setError(err.message || "Impossible de modifier votre disponibilité.");
    } finally {
      setBusy(false);
    }
  };
    return (
    <Card>
      <div className="setting-row" style={{ padding: 0 }}>
        <div>
          <strong>Disponibilité</strong>
          <p>Les livreurs indisponibles ne peuvent pas recevoir de nouvelle affectation.</p>

          {error && (
            <p style={{ color: "#dc2626", marginTop: 8 }}>
              {error}
            </p>
          )}
        </div>

        <div className="row">
          <AvailabilityBadge available={on} />
          <Switch
            label="Disponibilité"
            checked={on}
            disabled={busy}
            onChange={change}
          />
        </div>
      </div>
    </Card>
  );
}
function CurrentCity() {
  const { user, token, updateUser } = useAuth();
  const toast = useToast();

  const [cities, setCities] = useState([]);
  const [city, setCity] = useState(user.villeActuelle || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getCourierCities(token)
      .then((data) => {
        if (!cancelled) setCities(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Impossible de charger les villes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const saveCity = async (e) => {
    e.preventDefault();
    if (!city || city === user.villeActuelle) return;

    setSaving(true);
    setError("");

    try {
      const updatedUser = await updateCourierCurrentCity(city, token);
      updateUser(updatedUser);
      toast.success("Ville mise à jour", `Votre ville actuelle est maintenant ${updatedUser.ville_actuelle}.`);
    } catch (err) {
      setError(err.message || "Impossible de modifier votre ville.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        icon={MapPin}
        title="Ville actuelle"
        subtitle="Indiquez la ville où vous êtes actuellement pour recevoir les missions correspondantes."
      />

      <form onSubmit={saveCity} className="stack-sm">
        <Field
          as="select"
          label="Choisir votre ville"
          options={cities}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={loading ? "Chargement des villes..." : "Sélectionnez une ville"}
          disabled={loading || saving}
          required
        />

        {error && <Alert tone="danger" title="Erreur">{error}</Alert>}

        <div>
          <Button
            type="submit"
            loading={saving}
            disabled={loading || saving || !city || city === user.villeActuelle}
          >
            Enregistrer la ville
          </Button>
        </div>
      </form>
    </Card>
  );
}
export default function Profile() {
  const { user, logout } = useAuth(), [tab, setTab] = useState("info");
  const agency = getAgencyOfUser(user);
  return (
    <>
      <PageHeader title="Profil" description={agency ? `${ROLE_META[user.role].label} · ${agency.name}` : ROLE_META[user.role].label} />
      <div className="stack">
        <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "info", label: "Informations", icon: UserRound },
          { id: "security", label: "Sécurité", icon: Lock },
          ...(user.role !== "SUPER_ADMIN"
            ? [{ id: "prefs", label: "Préférences", icon: SlidersHorizontal }]
            : []),
        ]}
      />
        {tab === "info" && <div className="stack" style={{ maxWidth: 760 }}>{user.role === "LIVREUR" && (
  <>
    <Availability />
    <CurrentCity />
  </>
)}
<Identity />
          {agency && <Card><CardHeader icon={Building2} title="Agence de rattachement" /><p><strong>{agency.name}</strong></p><p className="muted">{agency.address}, {agency.city}</p></Card>}</div>}
        {tab === "security" && <Security />}
        {tab === "prefs" && <Preferences />}
          {user.role !== "SUPER_ADMIN" && (
            <Alert tone="info" title="Session de démonstration">
              Les modifications ne sont pas enregistrées côté serveur tant que l'API n'est pas connectée.
            </Alert>
          )}
        <div><Button variant="secondary" icon={LogOut} onClick={logout}>Se déconnecter</Button></div>
      </div>
    </>
  );
}
