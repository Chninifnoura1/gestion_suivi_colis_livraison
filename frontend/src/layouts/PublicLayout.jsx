import { Moon, Sun, ArrowRight } from "lucide-react";
import Logo from "../components/domain/Logo";
import Button from "../components/ui/Button";
import { IconButton } from "../components/ui";
import { Link } from "../lib/router";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";

export default function PublicLayout({ children, hero }) {
  const { resolved, toggle } = useTheme(), { user, home } = useAuth();
  return (
    <div className={`public${hero ? " public-hero" : ""}`}>
      <a href="#main" className="skip-link">Aller au contenu</a>
      <header className="pub-header">
        <Link to="/" className="pub-logo" aria-label="ColisTrack — accueil"><Logo inverse={hero} /></Link>
        <div className="pub-right">
          <IconButton icon={resolved === "dark" ? Sun : Moon} label={resolved === "dark" ? "Passer en mode clair" : "Passer en mode sombre"} onClick={toggle} className={hero ? "on-dark" : ""} />
          <Button to={user ? home : "/connexion"} variant={hero ? "glass" : "secondary"} size="md" iconRight={ArrowRight}>{user ? "Mon espace" : "Espace professionnel"}</Button>
        </div>
      </header>
      <main id="main" className="pub-main">{children}</main>
      <footer className="pub-footer">
        <Logo size={26} />
        <p>Suivi de colis et gestion logistique multi-agences.</p>
        <small>Pour votre confidentialité, le suivi public n'affiche aucune donnée personnelle.</small>
      </footer>
    </div>
  );
}
