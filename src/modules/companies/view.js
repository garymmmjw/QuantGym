export function createCompanyMark(company = {}, options = {}) {
  const mark = document.createElement("div");
  mark.className = `company-mark${options.className ? ` ${options.className}` : ""}`;
  mark.style.setProperty("--company-color", company.color);
  mark.style.setProperty("--company-accent", company.accent);
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = company.short || options.getInitials?.(company.name) || "";
  return mark;
}
