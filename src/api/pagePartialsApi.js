export async function fetchPagePartial(moduleId = "") {
  const response = await fetch(`/pages/${moduleId}.html`);
  if (!response.ok) {
    throw new Error(`Failed to load page partial: ${moduleId}`);
  }
  return response.text();
}
