export function Tabs({ items, value, onChange, variant = "underline", label = "Onglets" }) {
  const onKey = (e) => {
    const i = items.findIndex((t) => t.id === value);
    if (e.key === "ArrowRight") onChange(items[(i + 1) % items.length].id);
    if (e.key === "ArrowLeft") onChange(items[(i - 1 + items.length) % items.length].id);
  };
  return (
    <div className={`tabs tabs-${variant}`} role="tablist" aria-label={label} onKeyDown={onKey}>
      {items.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} tabIndex={value === t.id ? 0 : -1} className={value === t.id ? "on" : ""} onClick={() => onChange(t.id)}>
          {t.icon && <t.icon size={15} aria-hidden />}{t.label}{t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
