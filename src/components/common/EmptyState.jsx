export function EmptyState({ title = "", description = "" }) {
  return (
    <div className="empty-state">
      {title ? <strong>{title}</strong> : null}
      {description ? <p>{description}</p> : null}
    </div>
  );
}
