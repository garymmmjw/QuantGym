export type ApiErrorEnvelope = Readonly<{
  code: string;
  message: string;
  fieldErrors: Readonly<Record<string, readonly string[]>>;
  requestId: string;
  retryable: boolean;
}>;

export class ApiError extends Error {
  public readonly code: string;

  public readonly fieldErrors: Readonly<Record<string, readonly string[]>>;

  public readonly requestId: string | null;

  public readonly retryable: boolean;

  public readonly status: number;

  public constructor(options: {
    code: string;
    fieldErrors?: Readonly<Record<string, readonly string[]>>;
    message: string;
    requestId: string | null;
    retryable?: boolean;
    status: number;
  }) {
    super(options.message);
    this.name = "ApiError";
    this.code = options.code;
    this.fieldErrors = options.fieldErrors ?? {};
    this.requestId = options.requestId;
    this.retryable = options.retryable ?? false;
    this.status = options.status;
  }
}

export const isApiErrorEnvelope = (value: unknown): value is ApiErrorEnvelope => {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.code !== "string" || candidate.code.length === 0) return false;
  if (typeof candidate.message !== "string" || candidate.message.length === 0) return false;
  if (typeof candidate.requestId !== "string") return false;
  if (typeof candidate.retryable !== "boolean") return false;
  if (typeof candidate.fieldErrors !== "object" || candidate.fieldErrors === null) return false;
  return Object.values(candidate.fieldErrors as Record<string, unknown>).every(
    (messages) => Array.isArray(messages) && messages.every((message) => typeof message === "string"),
  );
};
