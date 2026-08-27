import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { forgetCsrfToken } from "../../../shared/api/csrf";
import { loginAccount } from "./auth.mutations";

const csrfToken = "c".repeat(43);
const authResponse = {
  user: {
    displayName: "Gary",
    email: "gary@example.com",
    emailVerified: true,
    preferences: { language: "zh-CN", theme: "light", version: 1 },
  },
} as const;

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  forgetCsrfToken();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("auth request integration", () => {
  it("performs a fresh CSRF exchange before the single credential POST", async () => {
    const sequence: string[] = [];
    vi.spyOn(document, "cookie", "get").mockReturnValue(`__Host-qg_csrf=${csrfToken}`);
    server.use(
      http.get("*/api/v2/auth/csrf", () => {
        sequence.push("csrf");
        return HttpResponse.json({ csrfToken });
      }),
      http.post("*/api/v2/auth/login", async ({ request }) => {
        sequence.push("login");
        expect(request.headers.get("x-csrf-token")).toBe(csrfToken);
        await expect(request.json()).resolves.toEqual({
          email: "gary@example.com",
          password: "secret",
        });
        return HttpResponse.json(authResponse);
      }),
    );

    await expect(loginAccount({
      email: "gary@example.com",
      password: "secret",
    })).resolves.toEqual(authResponse);

    expect(sequence).toEqual(["csrf", "login"]);
  });
});
