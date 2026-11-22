import { initials } from "../../lib/format";

export function Badge({ tone = "neutral", dot, icon: Icon, children, className = "" }) {
  return <span className={`badge tone-${tone} ${className}`}>{dot && <i className="badge-dot" />}{Icon && <Icon size={12} aria-hidden />}{children}</span>;
}

const hue = (s = "") => [...s].reduce((a, c) => (a + c.charCodeAt(0)) % 6, 0);
export function Avatar({ name, size = "md", tone, className = "" }) {
  return <span className={`avatar avatar-${size} av-${tone ?? hue(name)} ${className}`} aria-hidden="true">{initials(name)}</span>;
}

export function Person({ name, sub, size = "md" }) {
  return (
    <div className="person">
      <Avatar name={name} size={size} />
      <div className="person-txt"><strong className="truncate">{name}</strong>{sub && <small className="truncate">{sub}</small>}</div>
    </div>
  );
}
