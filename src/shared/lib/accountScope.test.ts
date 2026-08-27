import { createAccountScope } from "./accountScope";

describe("createAccountScope", () => {
  it("is stable across harmless identity formatting without exposing the identity", () => {
    const first = createAccountScope(" Gary@Example.com ");
    const second = createAccountScope("gary@example.com");

    expect(first).toBe(second);
    expect(first).toMatch(/^acct-[a-f0-9]{16}$/u);
    expect(first).not.toContain("gary");
    expect(first).not.toContain("example");
  });

  it("separates different authenticated identities", () => {
    expect(createAccountScope("gary@example.com"))
      .not.toBe(createAccountScope("other@example.com"));
  });
});
