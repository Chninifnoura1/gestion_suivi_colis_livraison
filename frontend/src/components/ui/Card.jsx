export function Card({ children, className = "", flush, as: Tag = "section", ...rest }) {
  return <Tag className={`card${flush ? " card-flush" : ""} ${className}`} {...rest}>{children}</Tag>;
}
export function CardHeader({ title, subtitle, action, icon: Icon }) {
  return (
    <header className="card-head">
      <div className="card-head-txt">
        {Icon && <span className="card-head-ic"><Icon size={16} /></span>}
        <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
      </div>
      {action && <div className="card-head-act">{action}</div>}
    </header>
  );
}
/* Liste de définitions : [[label, valeur], ...] */
export function InfoList({ items, cols = 1 }) {
  return (
    <dl className={`info-list info-cols-${cols}`}>
      {items.filter(Boolean).map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v ?? "—"}</dd></div>))}
    </dl>
  );
}
