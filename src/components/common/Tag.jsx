export function Tag({ label, variant = "" }) {
  if (!label) return null;
  const className = ["pill", variant].filter(Boolean).join(" ");
  return <span className={className}>{label}</span>;
}
