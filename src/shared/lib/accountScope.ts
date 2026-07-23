const fnv1a = (value: string, seed: number): string => {
  let hash = seed >>> 0;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

/**
 * Creates a stable, pseudonymous browser-storage namespace without persisting
 * the user's raw email address. It is an isolation key, not an authentication
 * or cryptographic primitive.
 */
export const createAccountScope = (identity: string): string => {
  const normalized = identity.normalize("NFKC").trim().toLocaleLowerCase();
  return `acct-${fnv1a(normalized, 0x811c9dc5)}${fnv1a(normalized, 0x9e3779b9)}`;
};
