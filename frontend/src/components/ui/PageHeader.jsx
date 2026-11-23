export default function PageHeader({ title, description, actions, back, meta }) {
  return (
    <div className="page-head">
      <div className="page-head-txt">
        {back}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {meta && <div className="page-head-meta">{meta}</div>}
      </div>
      {actions && <div className="page-head-act">{actions}</div>}
    </div>
  );
}
