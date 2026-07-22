import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.schema";

describe("auth form schemas", () => {
  it("accepts the backend-compatible login password range", () => {
    expect(loginSchema.parse({ email: "gary@example.com", password: "x" })).toEqual({
      email: "gary@example.com",
      password: "x",
    });
    expect(loginSchema.safeParse({ email: "gary@example.com", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "gary@example.com", password: "x".repeat(129) }).success).toBe(false);
  });

  it("normalizes registration text while enforcing the stronger password policy", () => {
    expect(registerSchema.parse({
      displayName: "  Gary  ",
      email: "  Gary@Example.com ",
      password: "long-password",
    })).toEqual({
      displayName: "Gary",
      email: "Gary@Example.com",
      password: "long-password",
    });
    expect(registerSchema.safeParse({
      displayName: "Gary",
      email: "gary@example.com",
      password: "x".repeat(11),
    }).success).toBe(false);
  });

  it("matches the backend display-name safety boundary", () => {
    expect(registerSchema.safeParse({
      displayName: "   ",
      email: "gary@example.com",
      password: "x".repeat(12),
    }).success).toBe(false);
    expect(registerSchema.safeParse({
      displayName: "Gary\u0007",
      email: "gary@example.com",
      password: "x".repeat(12),
    }).success).toBe(false);
    expect(registerSchema.safeParse({
      displayName: "x".repeat(121),
      email: "gary@example.com",
      password: "x".repeat(12),
    }).success).toBe(false);
  });

  it("validates forgot-password and reset-password payloads", () => {
    expect(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({
      token: "t".repeat(32),
      password: "x".repeat(12),
    }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({
      token: ` ${"t".repeat(32)}`,
      password: "x".repeat(12),
    }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({
      token: "t".repeat(32),
      password: "x".repeat(129),
    }).success).toBe(false);
  });
});
