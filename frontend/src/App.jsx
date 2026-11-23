import { Component, Suspense, useEffect } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ConfirmProvider } from "./context/ConfirmContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { RouterProvider, useRouter } from "./lib/router";
import { ROUTES, getCrumbs } from "./routes";
import AppShell from "./layouts/AppShell";
import PublicLayout from "./layouts/PublicLayout";
import { PageSkeleton, EmptyState } from "./components/ui";
import Button from "./components/ui/Button";
import { Compass } from "lucide-react";

class Boundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidUpdate(prev) { if (prev.k !== this.props.k && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return <div className="fullpage"><EmptyState title="Une erreur d'affichage est survenue" description="Rechargez la page. Si le problème persiste, contactez le support." action={<Button onClick={() => window.location.reload()}>Recharger</Button>} /></div>;
  }
}

function Redirect({ to }) {
  const { navigate } = useRouter();
  useEffect(() => navigate(to, { replace: true }), [to, navigate]);
  return null;
}

function NotFound() {
  const { user, home } = useAuth();
  return (
    <PublicLayout>
      <div className="fullpage" style={{ minHeight: "60vh" }}>
        <EmptyState icon={Compass} title="Page introuvable" description="Cette adresse n'existe pas ou a été déplacée." action={<Button to={user ? home : "/"}>Retour à l'accueil</Button>} />
      </div>
    </PublicLayout>
  );
}

function Screen() {
  const { route, params, path } = useRouter();
  const { user, home, logout } = useAuth();

  useEffect(() => {
    const handleBackToHome = () => {
      const currentPath =
        window.location.hash.replace(/^#/, "").split("?")[0] || "/";

      if (currentPath === "/" && user) {
        logout();
      }
    };

    window.addEventListener("popstate", handleBackToHome);

    return () => {
      window.removeEventListener("popstate", handleBackToHome);
    };
  }, [user, logout]);
  if (!route) return <NotFound />;
  const Page = route.component;

  if (route.roles) {
    if (!user) return <Redirect to={`/connexion?next=${encodeURIComponent(path)}`} />;
    if (!route.roles.includes(user.role)) return <Redirect to={home} />;
    return (
      <NotificationsProvider>
        <AppShell crumbs={getCrumbs(route, params)}>
          <Boundary k={path}><Suspense fallback={<PageSkeleton />}><Page /></Suspense></Boundary>
        </AppShell>
      </NotificationsProvider>
    );
  }
  if (route.guest && user) return <Redirect to={home} />;
  return <Boundary k={path}><Suspense fallback={<div className="fullpage" aria-busy="true" />}><Page /></Suspense></Boundary>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <RouterProvider routes={ROUTES}><Screen /></RouterProvider>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
