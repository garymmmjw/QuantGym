const PULL_REQUEST_EVENT = "pull_request";

export const validateFrontendV2BuildBranch = (value) => {
  if (
    !/^[A-Za-z0-9._/-]{1,128}$/.test(value)
    || value.includes("..")
    || value.includes("//")
  ) {
    throw new Error("V2_BUILD_BRANCH_INVALID");
  }
  return value;
};

const trustedGitHubActionsBranch = (environment) => {
  if (environment.GITHUB_ACTIONS !== "true") return "";
  if (environment.GITHUB_REF_TYPE === "tag") return "detached";
  if (environment.GITHUB_REF_TYPE !== "branch") return "detached";
  if (
    environment.GITHUB_EVENT_NAME === PULL_REQUEST_EVENT
    && environment.GITHUB_HEAD_REF
  ) {
    return environment.GITHUB_HEAD_REF;
  }
  if (environment.GITHUB_REF_NAME) {
    return environment.GITHUB_REF_NAME;
  }
  return "";
};

export const resolveRepositoryBuildBranch = (
  environment,
  readRepositoryBranch,
) => validateFrontendV2BuildBranch(
  trustedGitHubActionsBranch(environment)
    || readRepositoryBranch()
    || "detached",
);
