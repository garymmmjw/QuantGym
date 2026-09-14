import { reportCloudSessionResponse } from "../../state/cloudSessionStatus.js";
import { guardianRequest } from "./guardianApi.js";

// Only the student's code-management endpoints use the student cloud session.
// Guardian dashboard/session requests stay isolated in guardianApi.js.
export async function guardianOwnerRequest(path, { config, ...options }) {
  if (!/^\/(?:api\/)?guardian\/access(?:[/?]|$)/.test(path)) {
    throw new Error("Expected a guardian owner access endpoint");
  }
  const captured = { endpoint: config.endpoint, token: config.token, userId: config.userId };
  try {
    const result = await guardianRequest(path, { ...options, baseUrl: captured.endpoint, token: captured.token });
    reportCloudSessionResponse(captured, 200);
    return result;
  } catch (error) {
    reportCloudSessionResponse(captured, error.status);
    throw error;
  }
}
