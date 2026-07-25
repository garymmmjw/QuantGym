export function validateFrontendV2BuildBranch(value: string): string;

export function resolveRepositoryBuildBranch(
  environment: NodeJS.ProcessEnv,
  readRepositoryBranch: () => string,
): string;
