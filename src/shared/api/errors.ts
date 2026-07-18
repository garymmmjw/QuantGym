export type ApiErrorEnvelope = Readonly<{
  error: Readonly<{
    code: string;
    message: string;
  }>;
  requestId: string;
}>;

export class ApiError extends Error {
  public readonly code: string;

  public readonly requestId: string | null;

  public readonly status: number;

  public constructor(options: {
    code: string;
    message: string;
    requestId: string | null;
    status: number;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.code = options.code;
    this.requestId = options.requestId;
    this.status = options.status;
  }
}

export const isApiErrorEnvelope = (value: unknown): value is ApiErrorEnvelope => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.requestId !== "string") return false;
  if (typeof candidate.error !== "object" || candidate.error === null) return false;
  const error = candidate.error as Record<string, unknown>;
  return typeof error.code === "string" && typeof error.message === "string";
};
