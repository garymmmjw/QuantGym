export function CompanyMark({ company, getInitials }) {
  return (
    <div
      className="company-mark"
      style={{
        "--company-color": company.color,
        "--company-accent": company.accent
      }}
      aria-hidden="true"
    >
      {company.short || getInitials?.(company.name) || ""}
    </div>
  );
}
