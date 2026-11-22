import { AlertTriangle, CheckCircle2, Info, XCircle, WifiOff, Inbox } from "lucide-react";
import Button from "./Button";

export const Skeleton = ({ w = "100%", h = 14, r = 6, className = "", style }) => <span className={`skeleton ${className}`} style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden />;

export function CardSkeleton({ lines = 4, title = true }) {
  return (
    <div className="card" aria-busy="true" aria-label="Chargement">
      {title && <Skeleton w="38%" h={16} style={{ marginBottom: 18 }} />}
      {Array.from({ length: lines }, (_, i) => <Skeleton key={i} w={`${92 - i * 11}%`} style={{ marginBottom: 12 }} />)}
    </div>
  );
}
export function PageSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-label="Chargement de la page">
      <Skeleton w={260} h={30} r={8} />
      <Skeleton w={380} h={14} />
      <div className="kpi-strip" style={{ padding: 20, gap: 28 }}>{Array.from({ length: 4 }, (_, i) => <div key={i}><Skeleton w="50%" h={12} style={{ marginBottom: 12 }} /><Skeleton w="40%" h={28} /></div>)}</div>
      <CardSkeleton lines={5} />
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, compact }) {
  return (
    <div className={`empty${compact ? " empty-compact" : ""}`}>
      <span className="empty-ic"><Icon size={compact ? 22 : 28} /></span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && <div className="empty-act">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const offline = error?.code === "NETWORK";
  const forbidden = error?.code === "FORBIDDEN";
  return (
    <EmptyState
      icon={offline ? WifiOff : AlertTriangle}
      title={forbidden ? "Accès refusé" : offline ? "Connexion impossible" : "Une erreur est survenue"}
      description={error?.message || "Impossible de charger ces informations. Réessayez dans un instant."}
      action={!forbidden && onRetry && <Button variant="secondary" onClick={() => onRetry()}>Réessayer</Button>}
    />
  );
}

const A_ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle };
export function Alert({ tone = "info", title, children, action }) {
  const I = A_ICONS[tone];
  return (
    <div className={`alert alert-${tone}`} role={tone === "danger" ? "alert" : "note"}>
      <I size={18} aria-hidden />
      <div className="alert-body">{title && <strong>{title}</strong>}{children && <p>{children}</p>}</div>
      {action}
    </div>
  );
}
