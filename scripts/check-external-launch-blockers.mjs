#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || defaultRoot);
const requireClear = Boolean(args.requireClear);
const skipReleaseSummaryContent = Boolean(args.skipReleaseSummaryContent);
const summaryRequested = Boolean(args.summary);
const summaryPath = path.resolve(
  root,
  args.summary || "docs/browser-audit-screenshots/341-external-launch-blockers-summary.json"
);

const failures = [];
const warnings = [];
const packageJson = readJson("package.json", "package.json");
const productStatusText = readText("docs/product-status.md", "product status");
const googleTokenGateText = readText("scripts/run-google-token-gate.mjs", "Google token gate");

const evidence = {
  apexWwwDomain: readJson("docs/browser-audit-screenshots/355-apex-www-domain-summary.json", "apex/WWW domain smoke"),
  opsRuntime: readJson("docs/browser-audit-screenshots/334-ops-alert-runtime-smoke-summary.json", "ops alert runtime smoke"),
  opsWorker: readJson("docs/browser-audit-screenshots/356-ops-alert-worker-fixture-summary.json", "ops alert worker fixture"),
  opsFixture: readJson("docs/browser-audit-screenshots/336-ops-alert-production-fixture-summary.json", "ops alert production fixture"),
  opsPacket: readJson("docs/browser-audit-screenshots/346-ops-alert-edge-packet-summary.json", "ops alert edge packet"),
  opsProductionSignoff: readJsonOptional("docs/browser-audit-screenshots/361-ops-alert-production-signoff-summary.json", "ops alert production signoff"),
  mediaRuntime: readJson("docs/browser-audit-screenshots/329-media-storage-runtime-smoke-summary.json", "media storage runtime smoke"),
  mediaFixture: readJson("docs/browser-audit-screenshots/337-media-storage-production-fixture-summary.json", "media storage production fixture"),
  mediaPacket: readJson("docs/browser-audit-screenshots/347-media-storage-packet-summary.json", "media storage readiness packet"),
  jobsRuntime: readJson("docs/browser-audit-screenshots/330-jobs-source-runtime-smoke-summary.json", "jobs source runtime smoke"),
  jobsFixture: readJson("docs/browser-audit-screenshots/338-jobs-source-production-fixture-summary.json", "jobs source production fixture"),
  jobsPacket: readJson("docs/browser-audit-screenshots/349-jobs-feed-publication-packet-summary.json", "jobs feed publication packet"),
  jobsStaticFeed: readJson("docs/browser-audit-screenshots/353-jobs-public-ats-static-feed-summary.json", "jobs public ATS static feed"),
  jobsDeployedApiSource: readJson("docs/browser-audit-screenshots/354-deployed-jobs-api-source-summary.json", "deployed jobs API source smoke"),
  chromeFixture: readJson("docs/browser-audit-screenshots/339-chrome-store-publication-fixture-summary.json", "Chrome store publication fixture"),
  chromePacket: readJson("docs/browser-audit-screenshots/348-chrome-store-publication-packet-summary.json", "Chrome store publication packet"),
  renderApiBuildFilterFixture: readJson("docs/browser-audit-screenshots/359-render-api-build-filter-fixture-summary.json", "Render API build filter fixture"),
  renderApiBuildFilterPacket: readJson("docs/browser-audit-screenshots/358-render-api-build-filter-packet-summary.json", "Render API build filter packet"),
  renderApiBuildFilterProduction: readJson("docs/browser-audit-screenshots/360-render-api-build-filter-production-summary.json", "Render API build filter production signoff"),
  postgresExport: readJson("docs/browser-audit-screenshots/331-postgres-cutover-export-smoke-summary.json", "Postgres cutover export smoke"),
  postgresPacket: readJson("docs/browser-audit-screenshots/350-postgres-cutover-packet-summary.json", "Postgres cutover readiness packet"),
  rightsPublicSmoke: readJson("docs/browser-audit-screenshots/335-question-bank-rights-public-smoke-summary.json", "question-bank rights public smoke"),
  rightsBlockers: readJson("docs/browser-audit-screenshots/340-question-bank-rights-release-blockers-summary.json", "question-bank rights release blockers"),
  rightsPacket: readJson("docs/browser-audit-screenshots/345-question-bank-rights-packet-summary.json", "question-bank rights approval packet"),
  browserRouteSmoke: readJson("docs/browser-audit-screenshots/328-browser-route-smoke-summary.json", "browser route smoke"),
  deployedBetaSmoke: readJson("docs/browser-audit-screenshots/351-deployed-beta-smoke-summary.json", "deployed beta smoke"),
  deployedBetaMobileContentSmoke: readJson("docs/browser-audit-screenshots/352-deployed-beta-mobile-content-smoke-summary.json", "deployed beta mobile content smoke"),
  deployedProductionBoundaries: readJson("docs/browser-audit-screenshots/333-production-boundaries-deployed-services-summary.json", "deployed production boundary smoke"),
  googleTokenHelperFlow: readJson("docs/browser-audit-screenshots/356-google-token-helper-flow-summary.json", "Google token helper flow"),
  releaseReadiness: skipReleaseSummaryContent
    ? { results: [] }
    : readJson("docs/browser-audit-screenshots/323-release-readiness-summary.json", "release readiness")
};

const scripts = packageJson.scripts || {};
const requiredScripts = [
  "check:ops-alerts:production",
  "check:ops-alerts:worker-fixture",
  "build:ops-alert-edge-packet",
  "check:media-storage:production",
  "build:media-storage-packet",
  "check:jobs-source:production",
  "check:jobs-feed:static",
  "check:jobs-api:deployed-source",
  "build:jobs-feed:publication-packet",
  "check:chrome-store-publication:published",
  "build:chrome-store-publication-packet",
  "check:render-api-build-filter",
  "check:render-api-build-filter:production",
  "check:render-api-build-filter:fixture",
  "build:render-api-build-filter-packet",
  "check:postgres-cutover:complete",
  "build:postgres-cutover-packet",
  "check:question-bank-rights:public",
  "check:question-bank-rights:commercial",
  "build:question-bank-rights-packet",
  "check:apex-www-domain",
  "check:browser-route-smoke",
  "check:deployed-beta-smoke",
  "check:deployed-beta-smoke:deploy-window-fixture",
  "check:deployed-beta-mobile-content-smoke",
  "google:token-helper:deployed",
  "verify:production-boundaries:deployed:paste-token"
];

for (const name of requiredScripts) {
  expect(Boolean(scripts[name]), `package.json is missing ${name}.`);
}

const outstandingItems = extractOutstandingItems(productStatusText);
for (let index = 1; index <= 9; index += 1) {
  expect(outstandingItems.some((item) => item.index === index), `docs/product-status.md is missing Outstanding Item ${index}.`);
}

const jobsFeedCleared = evidence.jobsDeployedApiSource.status === "pass"
  && evidence.jobsDeployedApiSource.checks?.sourceMerged === true
  && evidence.jobsDeployedApiSource.checks?.sourceStatusOk === true
  && evidence.jobsDeployedApiSource.checks?.sourceCountLooksLikePublicAtsFeed === true
  && evidence.jobsDeployedApiSource.checks?.includesInternshipAndFulltime === true
  && evidence.jobsDeployedApiSource.checks?.sourceValidPostedAt === true
  && evidence.jobsDeployedApiSource.checks?.sourceRealMetadata === true
  && evidence.jobsDeployedApiSource.checks?.firstSourceJobMatchesStaticFeed === true;

const apexWwwClear = evidence.apexWwwDomain.status === "pass"
  && evidence.apexWwwDomain.checks?.apexWwwClear === true;
const apexPromotionHost = findHostSummary(evidence.apexWwwDomain.promotionHosts, "quantgym.app");
const wwwPromotionHost = findHostSummary(evidence.apexWwwDomain.promotionHosts, "www.quantgym.app");
const apexBlockedReasonRecorded = Boolean(String(apexPromotionHost?.https?.blockedReason || "").trim());
const wwwBlockedReasonRecorded = Boolean(String(wwwPromotionHost?.https?.blockedReason || "").trim());

const deployedBoundaryGoogleProviderLogin = findResult(evidence.deployedProductionBoundaries.results, "google provider login");
const deployedBoundaryLlmResumeReview = findResult(evidence.deployedProductionBoundaries.results, "LLM resume review");
const deployedBoundaryLlmPdfQuestionGeneration = findResult(evidence.deployedProductionBoundaries.results, "LLM PDF question generation");
const deployedGoogleProviderLoginPassed = deployedBoundaryGoogleProviderLogin?.status === "pass"
  && deployedBoundaryGoogleProviderLogin?.data?.googleLinked === true
  && deployedBoundaryGoogleProviderLogin?.data?.tokenAudienceMatchesClientId === true;
const deployedGoogleProviderLoginSkippedForToken = deployedBoundaryGoogleProviderLogin?.status === "skip"
  && String(deployedBoundaryGoogleProviderLogin?.reason || "").includes("QUANTGYM_GOOGLE_ID_TOKEN");
const deployedBoundaryLlmResumeReviewPass = deployedBoundaryLlmResumeReview?.status === "pass";
const deployedBoundaryLlmPdfQuestionGenerationPass = deployedBoundaryLlmPdfQuestionGeneration?.status === "pass";
const deployedBoundaryLlmResumeReviewSkippedForAuth = deployedBoundaryLlmResumeReview?.status === "skip"
  && /QUANTGYM_(?:LLM_BEARER_TOKEN|GOOGLE_ID_TOKEN)/.test(String(deployedBoundaryLlmResumeReview?.reason || ""));
const deployedBoundaryLlmPdfQuestionGenerationSkippedForAuth = deployedBoundaryLlmPdfQuestionGeneration?.status === "skip"
  && /QUANTGYM_(?:LLM_BEARER_TOKEN|GOOGLE_ID_TOKEN)/.test(String(deployedBoundaryLlmPdfQuestionGeneration?.reason || ""));
const deployedGoogleProviderLoginTokenExpiresAt = String(deployedBoundaryGoogleProviderLogin?.data?.tokenExpiresAt || "").trim();
const deployedGoogleProviderLoginSecondsRemaining = secondsUntil(deployedGoogleProviderLoginTokenExpiresAt);
const deployedGoogleProviderLoginTokenFresh = Number.isFinite(deployedGoogleProviderLoginSecondsRemaining)
  && deployedGoogleProviderLoginSecondsRemaining >= 120;
const deployedGoogleProviderLoginTokenExpired = Number.isFinite(deployedGoogleProviderLoginSecondsRemaining)
  && deployedGoogleProviderLoginSecondsRemaining < 120;
const redactedEmailPattern = /^\S{2}\*\*\*@[^@\s]+$/;
const deployedGoogleProviderCleared = evidence.deployedProductionBoundaries.status === "pass"
  && deployedGoogleProviderLoginPassed
  && deployedGoogleProviderLoginTokenFresh;

const renderApiBuildFilterProductionPaths = Array.isArray(evidence.renderApiBuildFilterProduction.configuredPaths)
  ? evidence.renderApiBuildFilterProduction.configuredPaths
  : [];
const renderApiBuildFilterProductionCleared = evidence.renderApiBuildFilterProduction.status === "pass"
  && evidence.renderApiBuildFilterProduction.mode === "production"
  && evidence.renderApiBuildFilterProduction.service === "quantgym-api"
  && ["dashboard", "cli", "api", "blueprint"].includes(String(evidence.renderApiBuildFilterProduction.method || ""))
  && renderApiBuildFilterProductionPaths.length === 2
  && renderApiBuildFilterProductionPaths.includes("api-server/**")
  && renderApiBuildFilterProductionPaths.includes("data/**")
  && evidence.renderApiBuildFilterProduction.evidenceHost === "dashboard.render.com"
  && evidence.renderApiBuildFilterProduction.checks?.productionSignoffPass === true
  && evidence.renderApiBuildFilterProduction.checks?.productionMode === true
  && evidence.renderApiBuildFilterProduction.checks?.recommendedPathsExact === true
  && evidence.renderApiBuildFilterProduction.checks?.hasApiServerPath === true
  && evidence.renderApiBuildFilterProduction.checks?.hasDataPath === true
  && evidence.renderApiBuildFilterProduction.checks?.noUnexpectedPaths === true
  && evidence.renderApiBuildFilterProduction.checks?.methodAllowed === true
  && evidence.renderApiBuildFilterProduction.checks?.serviceNamePass === true
  && evidence.renderApiBuildFilterProduction.checks?.evidenceUrlSafe === true
  && evidence.renderApiBuildFilterProduction.checks?.notesSpecific === true
  && Array.isArray(evidence.renderApiBuildFilterProduction.failures)
  && evidence.renderApiBuildFilterProduction.failures.length === 0;

const opsProductionSignoffCleared = evidence.opsProductionSignoff.status === "pass"
  && evidence.opsProductionSignoff.mode === "production"
  && evidence.opsProductionSignoff.smoke === true
  && evidence.opsProductionSignoff.alertWebhookProtocol === "https"
  && evidence.opsProductionSignoff.edgeProvider === "cloudflare"
  && String(evidence.opsProductionSignoff.edgeEvidenceHost || "").endsWith("cloudflare.com")
  && evidence.opsProductionSignoff.checks?.productionSignoffPass === true
  && evidence.opsProductionSignoff.checks?.alertWebhookConfigured === true
  && evidence.opsProductionSignoff.checks?.alertWebhookHttps === true
  && evidence.opsProductionSignoff.checks?.alertWebhookTokenSet === true
  && evidence.opsProductionSignoff.checks?.rateLimitsEnabled === true
  && evidence.opsProductionSignoff.checks?.edgeRateLimitConfirmed === true
  && evidence.opsProductionSignoff.checks?.edgeProviderSet === true
  && evidence.opsProductionSignoff.checks?.edgeNotesDescribeAuthSurface === true
  && evidence.opsProductionSignoff.checks?.edgeNotesDescribeClientIdentity === true
  && evidence.opsProductionSignoff.checks?.edgeNotesDescribeEnforcementAction === true
  && evidence.opsProductionSignoff.checks?.edgeEvidenceHostSet === true
  && evidence.opsProductionSignoff.checks?.webhookSmokeRequired === true
  && evidence.opsProductionSignoff.checks?.webhookSmokePass === true
  && evidence.opsProductionSignoff.checks?.webhookSmokeDelivered === true
  && evidence.opsProductionSignoff.checks?.webhookSmokeSignatureVerificationAcked === true;

const blockers = [
  {
    id: "apex-www-ssl",
    title: "Apex/WWW domain SSL or redirect",
    status: apexWwwClear ? "pass" : "blocked",
    ownerAction: apexWwwClear
      ? "Apex and WWW HTTPS are usable; keep the canonical domain policy documented before promotion."
      : "Fix Cloudflare/origin SSL handshakes or intentionally redirect quantgym.app and www.quantgym.app before promoting those domains.",
    signoffCommand: "npm run check:apex-www-domain -- --require-clear",
    localCoverage: apexWwwClear
      ? {
        trackedInProductStatus: productStatusIncludes(["quantgym.app", "www.quantgym.app"]),
        liveDiagnosisPass: evidence.apexWwwDomain.status === "pass",
        betaEntrypointHealthy: evidence.apexWwwDomain.checks?.betaHealthy === true,
        apexUsableHttps: evidence.apexWwwDomain.checks?.apexUsableHttps === true,
        wwwUsableHttps: evidence.apexWwwDomain.checks?.wwwUsableHttps === true,
        requireClearModeAvailable: evidence.apexWwwDomain.checks?.requireClearModeAvailable === true
      }
      : {
        trackedInProductStatus: productStatusIncludes(["quantgym.app", "www.quantgym.app", "check:apex-www-domain"]),
        liveDiagnosisPass: evidence.apexWwwDomain.status === "pass",
        betaEntrypointHealthy: evidence.apexWwwDomain.checks?.betaHealthy === true,
        apexDnsResolved: evidence.apexWwwDomain.checks?.apexDnsResolved === true,
        wwwDnsResolved: evidence.apexWwwDomain.checks?.wwwDnsResolved === true,
        currentBlockedStateClassified: evidence.apexWwwDomain.checks?.currentBlockedStateClassified === true,
        apexPromotionHostBlocked: apexPromotionHost?.https?.usableHttps === false && apexBlockedReasonRecorded,
        wwwPromotionHostBlocked: wwwPromotionHost?.https?.usableHttps === false && wwwBlockedReasonRecorded,
        apexBlockedReason: String(apexPromotionHost?.https?.blockedReason || ""),
        wwwBlockedReason: String(wwwPromotionHost?.https?.blockedReason || ""),
        apexCloudflare525Observed: evidence.apexWwwDomain.checks?.apexCloudflare525Observed === true,
        wwwCloudflare525Observed: evidence.apexWwwDomain.checks?.wwwCloudflare525Observed === true,
        requireClearModeAvailable: evidence.apexWwwDomain.checks?.requireClearModeAvailable === true,
        requireClearWouldFail: evidence.apexWwwDomain.checks?.requireClearWouldFail === true
      }
  },
  {
    id: "deployed-google-provider-login",
    title: "Deployed Google provider account login",
    status: deployedGoogleProviderCleared ? "pass" : "blocked",
    ownerAction: deployedGoogleProviderCleared
      ? "Deployed Google provider login is signed off with a fresh token that matches the deployed Google Client ID."
      : "Generate a fresh deployed Google ID token with npm run google:token-helper:deployed, then run npm run verify:production-boundaries:deployed:paste-token before the token expires.",
    signoffCommand: "npm run verify:production-boundaries:deployed:paste-token",
    localCoverage: {
      trackedInProductStatus: productStatusIncludes([
        "google:token-helper:deployed",
        "verify:production-boundaries:deployed:paste-token"
      ]),
      deployedBoundarySummaryPresent: Boolean(evidence.deployedProductionBoundaries.status),
      deployedBoundaryCloudHealthPass: findResult(evidence.deployedProductionBoundaries.results, "cloud health")?.status === "pass",
      deployedBoundaryGoogleConfigPass: findResult(evidence.deployedProductionBoundaries.results, "google provider config")?.status === "pass",
      deployedBoundaryLlmResumeReviewPass,
      deployedBoundaryLlmPdfQuestionGenerationPass,
      deployedBoundaryLlmResumeReviewSkippedForAuth,
      deployedBoundaryLlmPdfQuestionGenerationSkippedForAuth,
      deployedGoogleProviderLoginStateCaptured: Boolean(deployedBoundaryGoogleProviderLogin?.status),
      deployedGoogleProviderLoginTokenExpiresAt,
      deployedGoogleProviderLoginTokenMinimumSeconds: 120,
      deployedGoogleProviderLoginTokenFresh,
      deployedGoogleProviderLoginTokenExpired,
      ...(deployedGoogleProviderCleared
        ? {
          deployedGoogleProviderLoginPass: deployedBoundaryGoogleProviderLogin?.status === "pass",
          deployedGoogleProviderLoginHasToken: deployedBoundaryGoogleProviderLogin?.data?.hasToken === true,
          deployedGoogleProviderLoginGoogleLinked: deployedBoundaryGoogleProviderLogin?.data?.googleLinked === true,
          deployedGoogleProviderLoginTokenAudienceMatchesClientId: deployedBoundaryGoogleProviderLogin?.data?.tokenAudienceMatchesClientId === true,
          deployedGoogleProviderLoginEmailRedacted: redactedEmailPattern.test(String(deployedBoundaryGoogleProviderLogin?.data?.email || "")),
          deployedGoogleProviderLoginTokenEmailRedacted: redactedEmailPattern.test(String(deployedBoundaryGoogleProviderLogin?.data?.tokenEmail || ""))
        }
        : {
          deployedGoogleProviderLoginSkippedForToken
        }),
      deployedTokenHelperScriptPresent: Boolean(scripts["google:token-helper:deployed"]),
      deployedPasteTokenVerifierPresent: Boolean(scripts["verify:production-boundaries:deployed:paste-token"]),
      deployedPasteTokenAudiencePrecheck: googleTokenGateText.includes("tokenAudienceMatchesExpected")
        && googleTokenGateText.includes("Google ID token audience does not match the ${expected.label} Google Client ID"),
      deployedPasteTokenDamagedAudienceDiagnostics: evidence.googleTokenHelperFlow.checks?.deployedPasteTokenRejectsDamagedGoogleAudience === true
        && evidence.googleTokenHelperFlow.damagedAudienceGate?.tokenAudienceHost === "googleusercont.com"
        && evidence.googleTokenHelperFlow.damagedAudienceGate?.expectedGoogleClientIdHost === "googleusercontent.com",
      deployedPasteTokenDamagedAudienceNoTokenLeak: evidence.googleTokenHelperFlow.checks?.deployedPasteTokenRejectsDamagedGoogleAudienceWithoutTokenLeak === true
        && evidence.googleTokenHelperFlow.damagedAudienceGate?.tokenPrinted === false,
      deployedPasteTokenPinsDeployedClientId: googleTokenGateText.includes("https://beta.quantgym.app/config.js")
        && googleTokenGateText.includes("env.QUANTGYM_GOOGLE_CLIENT_ID = expected.clientId")
    }
  },
  {
    id: "ops-alerts-edge-rate-limit",
    title: "Production alert receiver and edge rate limits",
    status: opsProductionSignoffCleared ? "pass" : "blocked",
    ownerAction: opsProductionSignoffCleared
      ? "Production alert receiver and Cloudflare edge rate limits are signed off with a verified webhook smoke."
      : "Configure the real alert receiver and edge rate limits, then run the production config and webhook-smoke signoff commands with real provider, notes, and HTTPS evidence URL.",
    signoffCommand: "npm run check:ops-alerts:production && npm run check:ops-alerts:production -- --smoke",
    localCoverage: {
      runtimeSmokePass: evidence.opsRuntime.status === "pass",
      workerFixturePass: evidence.opsWorker.status === "pass",
      workerFixtureValidAccepted: evidence.opsWorker.checks?.validAccepted === true,
      workerFixtureVerificationHeader: evidence.opsWorker.checks?.validVerificationHeader === true,
      workerFixtureJsonAck: evidence.opsWorker.checks?.validJsonAck === true,
      workerFixtureRejectsWrongBearer: evidence.opsWorker.checks?.wrongBearerRejected === true,
      workerFixtureRejectsWrongSignature: evidence.opsWorker.checks?.wrongSignatureRejected === true,
      workerFixtureRejectsMissingEnvToken: evidence.opsWorker.checks?.missingEnvTokenRejected === true,
      workerFixtureRejectsNonPost: evidence.opsWorker.checks?.nonPostRejected === true,
      workerFixtureRejectsInvalidJson: evidence.opsWorker.checks?.invalidJsonRejected === true,
      workerFixtureNoSecretLeak: evidence.opsWorker.checks?.noSecretLeak === true,
      productionFixturePass: evidence.opsFixture.status === "pass",
      readinessPacketGenerated: evidence.opsPacket.status === "pass",
      packetIncludesProductionEnvTemplate: evidence.opsPacket.checks?.includesProductionEnvTemplate === true,
      packetIncludesCloudflareWorkerRunbook: evidence.opsPacket.checks?.includesCloudflareWorkerRunbook === true,
      packetIncludesWebhookContract: evidence.opsPacket.checks?.includesWebhookContract === true,
      packetIncludesCloudflareRuleRunbook: evidence.opsPacket.checks?.includesCloudflareRuleRunbook === true,
      packetIncludesSignoffChecklist: evidence.opsPacket.checks?.includesSignoffChecklist === true,
      packetIncludesWebhookSmokeSignoff: evidence.opsPacket.checks?.includesWebhookSmokeSignoff === true,
      packetIncludesRawIpUrlRule: evidence.opsPacket.checks?.includesRawIpUrlRule === true,
      packetIncludesWebhookSignatureContract: evidence.opsPacket.checks?.includesWebhookSignatureContract === true,
      packetSignoffRequiresWebhookSmoke: evidence.opsPacket.signoffCommand === "npm run check:ops-alerts:production && npm run check:ops-alerts:production -- --smoke",
      packetUsesPlaceholderOnlyForToken: evidence.opsPacket.checks?.usesPlaceholderOnlyForToken === true,
      localWebhookSmokeDelivered: evidence.opsFixture.checks?.localWebhookSmokeDelivered === true,
      localWebhookSmokeAuthorized: evidence.opsFixture.checks?.localWebhookSmokeAuthorized === true,
      localWebhookSmokeSignatureValid: evidence.opsFixture.checks?.localWebhookSmokeSignatureValid === true,
      localWebhookSmokeVerificationAcked: evidence.opsFixture.checks?.localWebhookSmokeVerificationAcked === true,
      localWebhookSmokePayloadSafe: evidence.opsFixture.checks?.localWebhookSmokePayloadSafe === true,
      smokeWithoutVerificationAckRejected: evidence.opsFixture.checks?.smokeWithoutVerificationAckRejected === true,
      smokeWithoutVerificationAckNoDeliverySecretLeak: evidence.opsFixture.checks?.smokeWithoutVerificationAckNoDeliverySecretLeak === true,
      productionSmokeBlockedWhenConfigInvalid: evidence.opsFixture.checks?.productionSmokeBlockedWhenConfigInvalid === true,
      productionSmokeNoDeliveryWhenConfigInvalid: evidence.opsFixture.checks?.productionSmokeNoDeliveryWhenConfigInvalid === true,
      productionSmokeFailureExplained: evidence.opsFixture.checks?.productionSmokeFailureExplained === true,
      validProductionWebhookTokenRedacted: evidence.opsFixture.checks?.validProductionWebhookTokenRedacted === true,
      validProductionWebhookUrlRedacted: evidence.opsFixture.checks?.validProductionWebhookUrlRedacted === true,
      validProductionEdgeEvidenceUrlRedacted: evidence.opsFixture.checks?.validProductionEdgeEvidenceUrlRedacted === true,
      validProductionEdgeNotesDescribeAuthSurface: evidence.opsFixture.checks?.validProductionEdgeNotesDescribeAuthSurface === true,
      validProductionEdgeNotesDescribeClientIdentity: evidence.opsFixture.checks?.validProductionEdgeNotesDescribeClientIdentity === true,
      validProductionEdgeNotesDescribeEnforcementAction: evidence.opsFixture.checks?.validProductionEdgeNotesDescribeEnforcementAction === true,
      shortWebhookTokenRejected: evidence.opsFixture.checks?.shortWebhookTokenRejected === true,
      placeholderWebhookTokenRejected: evidence.opsFixture.checks?.placeholderWebhookTokenRejected === true,
      webhookUrlRawIpRejected: evidence.opsFixture.checks?.webhookUrlRawIpRejected === true,
      webhookUrlEmbeddedCredentialsRejected: evidence.opsFixture.checks?.webhookUrlEmbeddedCredentialsRejected === true,
      webhookUrlQueryRejected: evidence.opsFixture.checks?.webhookUrlQueryRejected === true,
      edgeEvidenceUrlRawIpRejected: evidence.opsFixture.checks?.edgeEvidenceUrlRawIpRejected === true,
      edgeEvidenceUrlEmbeddedCredentialsRejected: evidence.opsFixture.checks?.edgeEvidenceUrlEmbeddedCredentialsRejected === true,
      edgeEvidenceUrlQueryRejected: evidence.opsFixture.checks?.edgeEvidenceUrlQueryRejected === true,
      genericEdgeNotesRejected: evidence.opsFixture.checks?.genericEdgeNotesRejected === true,
      edgeNotesMissingClientIdentityRejected: evidence.opsFixture.checks?.edgeNotesMissingClientIdentityRejected === true,
      edgeNotesMissingEnforcementActionRejected: evidence.opsFixture.checks?.edgeNotesMissingEnforcementActionRejected === true,
      privateWebhookRejected: findResult(evidence.opsFixture.negativeFixtures, "private webhook rejected")?.rejected === true,
      privateEdgeEvidenceRejected: findResult(evidence.opsFixture.negativeFixtures, "private edge evidence rejected")?.rejected === true,
      productionSignoffSummaryPresent: Boolean(evidence.opsProductionSignoff.status),
      productionSignoffPass: evidence.opsProductionSignoff.checks?.productionSignoffPass === true,
      productionSignoffMode: evidence.opsProductionSignoff.mode === "production",
      productionSignoffSmoke: evidence.opsProductionSignoff.smoke === true,
      productionAlertWebhookHostSet: Boolean(evidence.opsProductionSignoff.alertWebhookHost),
      productionAlertWebhookHttps: evidence.opsProductionSignoff.alertWebhookProtocol === "https",
      productionEdgeProviderCloudflare: evidence.opsProductionSignoff.edgeProvider === "cloudflare",
      productionEdgeEvidenceHostCloudflare: String(evidence.opsProductionSignoff.edgeEvidenceHost || "").endsWith("cloudflare.com"),
      productionWebhookSmokePass: evidence.opsProductionSignoff.checks?.webhookSmokePass === true,
      productionWebhookSmokeDelivered: evidence.opsProductionSignoff.checks?.webhookSmokeDelivered === true,
      productionWebhookSmokeVerificationAcked: evidence.opsProductionSignoff.checks?.webhookSmokeSignatureVerificationAcked === true
    }
  },
  {
    id: "media-bucket-cdn",
    title: "Production S3/R2 media bucket and CDN",
    status: "blocked",
    ownerAction: "Configure the real object bucket and public CDN/base URL, then run the production config and live media storage signoff commands.",
    signoffCommand: "npm run check:media-storage:production && npm run check:media-storage:production -- --live",
    localCoverage: {
      runtimeSmokePass: evidence.mediaRuntime.status === "pass",
      productionFixturePass: evidence.mediaFixture.status === "pass",
      readinessPacketGenerated: evidence.mediaPacket.status === "pass",
      packetIncludesProductionEnvTemplate: evidence.mediaPacket.checks?.includesProductionEnvTemplate === true,
      packetIncludesBucketCdnRunbook: evidence.mediaPacket.checks?.includesBucketCdnRunbook === true,
      packetIncludesObjectStorageContract: evidence.mediaPacket.checks?.includesObjectStorageContract === true,
      packetIncludesLiveSmokeChecklist: evidence.mediaPacket.checks?.includesLiveSmokeChecklist === true,
      packetIncludesProductionConfigSignoff: evidence.mediaPacket.checks?.includesProductionConfigSignoff === true,
      packetSignoffRequiresConfigAndLive: evidence.mediaPacket.signoffCommand === "npm run check:media-storage:production && npm run check:media-storage:production -- --live",
      packetIncludesRawIpUrlRule: evidence.mediaPacket.checks?.includesRawIpUrlRule === true,
      packetUsesPlaceholderOnlyForSecrets: evidence.mediaPacket.checks?.usesPlaceholderOnlyForSecrets === true,
      validProductionAccessKeyRedacted: evidence.mediaFixture.checks?.validProductionAccessKeyRedacted === true,
      validProductionSecretRedacted: evidence.mediaFixture.checks?.validProductionSecretRedacted === true,
      validProductionBucketRedacted: evidence.mediaFixture.checks?.validProductionBucketRedacted === true,
      validProductionEndpointUrlRedacted: evidence.mediaFixture.checks?.validProductionEndpointUrlRedacted === true,
      validProductionPublicBaseUrlRedacted: evidence.mediaFixture.checks?.validProductionPublicBaseUrlRedacted === true,
      privateObjectEndpointRejected: findResult(evidence.mediaFixture.negativeFixtures, "private object endpoint rejected")?.rejected === true,
      privatePublicBaseRejected: findResult(evidence.mediaFixture.negativeFixtures, "private public base rejected")?.rejected === true,
      endpointRawIpRejected: evidence.mediaFixture.checks?.endpointRawIpRejected === true,
      endpointEmbeddedCredentialsRejected: evidence.mediaFixture.checks?.endpointEmbeddedCredentialsRejected === true,
      endpointQueryRejected: evidence.mediaFixture.checks?.endpointQueryRejected === true,
      publicBaseRawIpRejected: evidence.mediaFixture.checks?.publicBaseRawIpRejected === true,
      publicBaseEmbeddedCredentialsRejected: evidence.mediaFixture.checks?.publicBaseEmbeddedCredentialsRejected === true,
      publicBaseQueryRejected: evidence.mediaFixture.checks?.publicBaseQueryRejected === true,
      rawProviderPublicBaseRejected: evidence.mediaFixture.checks?.rawProviderPublicBaseRejected === true,
      placeholderAccessKeyRejected: evidence.mediaFixture.checks?.placeholderAccessKeyRejected === true,
      shortSecretKeyRejected: evidence.mediaFixture.checks?.shortSecretKeyRejected === true,
      unsafeBucketNameRejected: evidence.mediaFixture.checks?.unsafeBucketNameRejected === true,
      unsafeObjectPrefixRejected: evidence.mediaFixture.checks?.unsafeObjectPrefixRejected === true,
      liveFixturePass: evidence.mediaFixture.checks?.liveFixturePutGetPublicDelete === true,
      liveFixturePreservesContentType: evidence.mediaFixture.checks?.liveFixturePreservesContentType === true,
      liveFixtureSupportsPublicRange: evidence.mediaFixture.checks?.liveFixturePublicRangePass === true,
      liveFailureRejected: evidence.mediaFixture.checks?.liveFailureRejected === true,
      liveCleanupPass: evidence.mediaFixture.checks?.liveFailureCleanedUp === true,
      liveSmokeNoObjectWritesWhenConfigInvalid: evidence.mediaFixture.checks?.liveSmokeNoObjectWritesWhenConfigInvalid === true,
      packetIncludesLiveWriteBlockerEvidence: evidence.mediaPacket.checks?.liveSmokeBlocksUnsafeProductionWrites === true,
      packetIncludesPublicRangeContract: evidence.mediaPacket.checks?.includesPublicRangeContract === true,
      packetIncludesPublicRangeEvidence: evidence.mediaPacket.checks?.liveFixtureSupportsPublicRange === true
    }
  },
  {
    id: "jobs-real-feed",
    title: "Real internship/full-time jobs feed",
    status: jobsFeedCleared ? "pass" : "blocked",
    ownerAction: jobsFeedCleared
      ? "Deployed API source feed is live and signed off; keep the public ATS refresh cadence monitored."
      : "Configure and operate a real crawler or vendor feed, then run the live deployed jobs API source signoff.",
    signoffCommand: "npm run check:jobs-api:deployed-source",
    localCoverage: {
      runtimeSmokePass: evidence.jobsRuntime.status === "pass",
      productionFixturePass: evidence.jobsFixture.status === "pass",
      readinessPacketGenerated: evidence.jobsPacket.status === "pass",
      packetGeneratedFeedSnapshot: evidence.jobsPacket.checks?.generatedFeedSnapshotWritten === true,
      packetGeneratedFeedShaMatches: evidence.jobsPacket.checks?.generatedFeedShaMatches === true,
      packetGeneratedFeedIncludesInternshipAndFulltime: evidence.jobsPacket.checks?.generatedFeedIncludesInternshipAndFulltime === true,
      packetGeneratedFeedHasRealMetadata: evidence.jobsPacket.checks?.generatedFeedHasRealMetadata === true,
      staticFeedPass: evidence.jobsStaticFeed.status === "pass",
      staticFeedPublicUrlReady: evidence.jobsStaticFeed.checks?.publicUrlHttps === true
        && evidence.jobsStaticFeed.checks?.publicUrlStablePath === true,
      staticFeedIncludesInternshipAndFulltime: evidence.jobsStaticFeed.checks?.includesInternshipAndFulltime === true,
      staticFeedHasRealMetadata: evidence.jobsStaticFeed.checks?.realMetadata === true
        && evidence.jobsStaticFeed.checks?.validUrls === true
        && evidence.jobsStaticFeed.checks?.validPostedAt === true,
      staticFeedShaSet: evidence.jobsStaticFeed.checks?.feedSha256Set === true,
      deployedApiSourcePass: evidence.jobsDeployedApiSource.status === "pass",
      deployedApiSourceMerged: evidence.jobsDeployedApiSource.checks?.sourceMerged === true,
      deployedApiSourceStatusOk: evidence.jobsDeployedApiSource.checks?.sourceStatusOk === true,
      deployedApiSourceCountLooksLikePublicAtsFeed: evidence.jobsDeployedApiSource.checks?.sourceCountLooksLikePublicAtsFeed === true,
      deployedApiSourceHasRealMetadata: evidence.jobsDeployedApiSource.checks?.sourceRealMetadata === true
        && evidence.jobsDeployedApiSource.checks?.sourceValidPostedAt === true,
      deployedApiFallbackCatalogMerged: evidence.jobsDeployedApiSource.checks?.fallbackCatalogMerged === true,
      packetIncludesProductionEnvTemplate: evidence.jobsPacket.checks?.includesProductionEnvTemplate === true,
      packetIncludesHostingRunbook: evidence.jobsPacket.checks?.includesHostingRunbook === true,
      packetIncludesLiveSignoffChecklist: evidence.jobsPacket.checks?.includesLiveSignoffChecklist === true,
      packetIncludesRawIpSourceUrlRule: evidence.jobsPacket.checks?.includesRawIpSourceUrlRule === true,
      privateSourceUrlRejected: findResult(evidence.jobsFixture.negativeFixtures, "private source URL rejected")?.rejected === true,
      sourceUrlRawIpRejected: evidence.jobsFixture.checks?.sourceUrlRawIpRejected === true,
      sourceUrlEmbeddedCredentialsRejected: evidence.jobsFixture.checks?.sourceUrlEmbeddedCredentialsRejected === true,
      sourceUrlQueryRejected: evidence.jobsFixture.checks?.sourceUrlQueryRejected === true,
      placeholderSourceTokenRejected: evidence.jobsFixture.checks?.placeholderSourceTokenRejected === true,
      shortSourceTokenRejected: evidence.jobsFixture.checks?.shortSourceTokenRejected === true,
      liveValidFixturePass: evidence.jobsFixture.checks?.liveValidPass === true,
      liveInvalidFeedsRejected: evidence.jobsFixture.checks?.liveInvalidFeedsRejected === true
    }
  },
  {
    id: "chrome-web-store-publication",
    title: "Chrome Web Store publication",
    status: "blocked",
    ownerAction: "Submit the release package through the Chrome Web Store developer account, wait for approval, and provide published listing evidence.",
    signoffCommand: "npm run check:chrome-store-publication:published",
    localCoverage: {
      publicationFixturePass: evidence.chromeFixture.status === "pass",
      readinessPacketGenerated: evidence.chromePacket.status === "pass",
      packetIncludesDeveloperDashboardChecklist: evidence.chromePacket.checks?.includesDeveloperDashboardChecklist === true,
      packetIncludesReleasePackageSha: evidence.chromePacket.checks?.includesReleasePackageSha === true,
      packetIncludesPublishedSignoffEnvTemplate: evidence.chromePacket.checks?.includesPublishedSignoffEnvTemplate === true,
      packetIncludesListingSnapshot: evidence.chromePacket.checks?.includesListingSnapshot === true,
      packetIncludesFinalSignoffChecklist: evidence.chromePacket.checks?.includesFinalSignoffChecklist === true,
      packetIncludesRawIpUrlRule: evidence.chromePacket.checks?.includesRawIpUrlRule === true,
      packetIncludesCurrentStoreHostRequirement: evidence.chromePacket.checks?.includesCurrentStoreHostRequirement === true,
      packetUsesPlaceholdersForPublishedIds: evidence.chromePacket.checks?.usesPlaceholdersForPublishedIds === true,
      packetReleasePackageExists: evidence.chromePacket.checks?.releasePackageExists === true,
      packetReleasePackageShaMatches: evidence.chromePacket.checks?.releasePackageShaMatches === true,
      submissionHandoffPass: evidence.chromeFixture.checks?.submissionHandoffPass === true,
      submissionHandoffManualSubmissionRequired: evidence.chromeFixture.checks?.submissionHandoffManualSubmissionRequired === true,
      publishedFixturePass: evidence.chromeFixture.checks?.publishedFixturePass === true,
      publishedFixtureHasAllChecks: evidence.chromeFixture.checks?.publishedFixtureHasAllChecks === true,
      publishedFixtureMatchesUploadSha: evidence.chromeFixture.checks?.publishedFixtureMatchesUploadSha === true,
      publishedFixtureVersionMatchesManifest: evidence.chromeFixture.checks?.publishedFixtureVersionMatchesManifest === true,
      negativeFixturesRejected: evidence.chromeFixture.checks?.negativeFixturesRejected === true,
      externalPublicationStillRequired: evidence.chromeFixture.checks?.externalPublicationStillRequired === true,
      privateEvidenceUrlRejected: findResult(evidence.chromeFixture.negativeFixtures, "private evidence URL rejected")?.rejected === true,
      placeholderItemIdRejected: evidence.chromeFixture.checks?.placeholderItemIdRejected === true,
      listingUrlRawIpRejected: evidence.chromeFixture.checks?.listingUrlRawIpRejected === true,
      listingUrlLegacyHostRejected: evidence.chromeFixture.checks?.listingUrlLegacyHostRejected === true,
      listingUrlEmbeddedCredentialsRejected: evidence.chromeFixture.checks?.listingUrlEmbeddedCredentialsRejected === true,
      listingUrlQueryRejected: evidence.chromeFixture.checks?.listingUrlQueryRejected === true,
      listingUrlDetailPathRejected: evidence.chromeFixture.checks?.listingUrlDetailPathRejected === true,
      listingUrlExtraPathRejected: evidence.chromeFixture.checks?.listingUrlExtraPathRejected === true,
      listingUrlExtraSegmentBeforeItemIdRejected: evidence.chromeFixture.checks?.listingUrlExtraSegmentBeforeItemIdRejected === true,
      evidenceUrlNonStoreRejected: evidence.chromeFixture.checks?.evidenceUrlNonStoreRejected === true,
      evidenceUrlWithoutItemIdRejected: evidence.chromeFixture.checks?.evidenceUrlWithoutItemIdRejected === true,
      evidenceUrlExtraSegmentBeforeItemIdRejected: evidence.chromeFixture.checks?.evidenceUrlExtraSegmentBeforeItemIdRejected === true,
      evidenceUrlRawIpRejected: evidence.chromeFixture.checks?.evidenceUrlRawIpRejected === true,
      evidenceUrlLegacyHostRejected: evidence.chromeFixture.checks?.evidenceUrlLegacyHostRejected === true,
      evidenceUrlEmbeddedCredentialsRejected: evidence.chromeFixture.checks?.evidenceUrlEmbeddedCredentialsRejected === true,
      evidenceUrlQueryRejected: evidence.chromeFixture.checks?.evidenceUrlQueryRejected === true,
      finalSignoffCommandRecorded: evidence.chromeFixture.finalSignoffCommand === "npm run check:chrome-store-publication:published"
    }
  },
  {
    id: "render-api-build-filter",
    title: "Render API service build filter",
    status: renderApiBuildFilterProductionCleared ? "pass" : "blocked",
    ownerAction: renderApiBuildFilterProductionCleared
      ? "Render quantgym-api service build filter is configured with included paths exactly api-server/** and data/** and has production dashboard signoff evidence."
      : "Configure the Render quantgym-api service build filter with included paths exactly api-server/** and data/**, then run the production signoff with specific notes and an HTTPS Render evidence URL.",
    signoffCommand: "npm run check:render-api-build-filter:production",
    localCoverage: {
      trackedInProductStatus: productStatusIncludes([
        "check:render-api-build-filter:production",
        "api-server/**",
        "data/**"
      ]),
      fixturePass: evidence.renderApiBuildFilterFixture.status === "pass",
      fixtureAcceptedValidProductionFilter: evidence.renderApiBuildFilterFixture.localCoverage?.validProductionBuildFilterAccepted === true,
      fixtureAcceptsCliMethod: evidence.renderApiBuildFilterFixture.localCoverage?.cliProductionBuildFilterAccepted === true,
      fixtureRejectsMissingDataPath: evidence.renderApiBuildFilterFixture.localCoverage?.missingDataPathRejected === true,
      fixtureRejectsDocsPath: evidence.renderApiBuildFilterFixture.localCoverage?.docsPathRejected === true,
      fixtureRejectsFrontendSrcPath: evidence.renderApiBuildFilterFixture.localCoverage?.frontendSrcPathRejected === true,
      fixtureRejectsUnsafeEvidenceUrl: evidence.renderApiBuildFilterFixture.localCoverage?.queryEvidenceUrlRejected === true,
      fixtureRejectsGenericNotes: evidence.renderApiBuildFilterFixture.localCoverage?.genericNotesRejected === true,
      fixtureMissingEnvNoDefaultSummaryWrite: evidence.renderApiBuildFilterFixture.localCoverage?.missingProductionEnvDoesNotWriteDefaultSummary === true,
      packetGenerated: evidence.renderApiBuildFilterPacket.status === "pass",
      packetIncludesExactRecommendedPaths: evidence.renderApiBuildFilterPacket.checks?.includesExactRecommendedPaths === true,
      packetExcludesDocsFrontendToolingPaths: evidence.renderApiBuildFilterPacket.checks?.excludesDocsFrontendToolingPaths === true,
      packetIncludesDashboardInstructions: evidence.renderApiBuildFilterPacket.checks?.includesDashboardInstructions === true,
      packetIncludesCliInstructions: evidence.renderApiBuildFilterPacket.checks?.includesCliInstructions === true,
      packetIncludesBlueprintSnippet: evidence.renderApiBuildFilterPacket.checks?.includesBlueprintSnippet === true,
      packetIncludesApiReferencePayload: evidence.renderApiBuildFilterPacket.checks?.includesApiReferencePayload === true,
      packetIncludesSignoffCommand: evidence.renderApiBuildFilterPacket.checks?.includesSignoffCommand === true,
      packetIncludesEvidenceUrlSafety: evidence.renderApiBuildFilterPacket.checks?.includesEvidenceUrlSafety === true,
      packetWarnsAgainstPartialBlueprint: evidence.renderApiBuildFilterPacket.checks?.includesNoHalfBlueprintWarning === true,
      packetHasNoFilledSecrets: evidence.renderApiBuildFilterPacket.checks?.noFilledSecrets === true,
      finalSignoffCommandRecorded: evidence.renderApiBuildFilterPacket.signoffCommand === "npm run check:render-api-build-filter:production",
      ...(renderApiBuildFilterProductionCleared
        ? {
          productionSignoffPass: evidence.renderApiBuildFilterProduction.checks?.productionSignoffPass === true,
          productionSignoffMode: evidence.renderApiBuildFilterProduction.mode === "production",
          productionSignoffService: evidence.renderApiBuildFilterProduction.service === "quantgym-api",
          productionSignoffMethodAllowed: evidence.renderApiBuildFilterProduction.checks?.methodAllowed === true,
          productionSignoffPathsExact: evidence.renderApiBuildFilterProduction.checks?.recommendedPathsExact === true,
          productionSignoffEvidenceHost: evidence.renderApiBuildFilterProduction.evidenceHost === "dashboard.render.com",
          productionSignoffNotesSpecific: evidence.renderApiBuildFilterProduction.checks?.notesSpecific === true
        }
        : {})
    }
  },
  {
    id: "postgres-managed-cutover",
    title: "Managed Postgres cutover",
    status: "blocked",
    ownerAction: "Run a protected full SQLite export, migrate into managed Postgres, activate the app DB, and provide complete cutover signoff evidence.",
    signoffCommand: 'npm run check:postgres-cutover:complete -- --db "$QUANTGYM_DB" --export /secure/quantgym-sqlite-export.json',
    localCoverage: {
      exportSmokePass: evidence.postgresExport.status === "pass",
      includeSensitiveAccepted: evidence.postgresExport.cutoverChecks?.includeSensitiveAccepted === true,
      postgresImportSqlGenerated: evidence.postgresExport.cutoverChecks?.postgresImportSqlGenerated === true,
      postgresImportSqlContainsTransaction: evidence.postgresExport.cutoverChecks?.postgresImportSqlContainsTransaction === true,
      postgresImportRejectsRedactedExport: evidence.postgresExport.cutoverChecks?.postgresImportRejectsRedactedExport === true,
      postgresImportRejectsTruncatedExport: evidence.postgresExport.cutoverChecks?.postgresImportRejectsTruncatedExport === true,
      readinessPacketGenerated: evidence.postgresPacket.status === "pass",
      packetIncludesSecureExportRunbook: evidence.postgresPacket.checks?.includesSecureExportRunbook === true,
      packetIncludesPostgresImportRunbook: evidence.postgresPacket.checks?.includesPostgresImportRunbook === true,
      packetIncludesSignoffEnvTemplate: evidence.postgresPacket.checks?.includesSignoffEnvTemplate === true,
      packetIncludesRollbackBackupChecklist: evidence.postgresPacket.checks?.includesRollbackBackupChecklist === true,
      packetIncludesLiveCutoverChecklist: evidence.postgresPacket.checks?.includesLiveCutoverChecklist === true,
      packetIncludesCompleteSignoffCommand: evidence.postgresPacket.checks?.includesCompleteSignoffCommand === true,
      packetSignoffCommandRecorded: evidence.postgresPacket.signoffCommand === 'npm run check:postgres-cutover:complete -- --db "$QUANTGYM_DB" --export /secure/quantgym-sqlite-export.json',
      packetUsesPlaceholdersOnlyForSensitivePaths: evidence.postgresPacket.checks?.usesPlaceholdersOnlyForSensitivePaths === true,
      packetNoCredentialUrlExamples: evidence.postgresPacket.checks?.noCredentialUrlExamples === true,
      packetRejectsUnsafeExports: evidence.postgresPacket.checks?.rejectsUnsafeExports === true,
      packetCompleteSignoffRejectsRawIpTarget: evidence.postgresPacket.checks?.completeSignoffRejectsRawIpTarget === true,
      packetCompleteSignoffRejectsUnsafeEvidence: evidence.postgresPacket.checks?.completeSignoffRejectsUnsafeEvidence === true,
      packetCompleteSignoffRequiresRuntimeBackend: evidence.postgresPacket.checks?.completeSignoffRequiresRuntimeBackend === true,
      packetCompleteSignoffRequiresRuntimeHealthUrl: evidence.postgresPacket.checks?.completeSignoffRequiresRuntimeHealthUrl === true,
      packetCompleteSignoffRejectsUnsafeRuntimeHealth: evidence.postgresPacket.checks?.completeSignoffRejectsUnsafeRuntimeHealth === true,
      packetIncludesRawIpEvidenceUrlRule: evidence.postgresPacket.checks?.includesRawIpEvidenceUrlRule === true,
      completeSignoffPositiveFixturePass: evidence.postgresExport.cutoverChecks?.completeSignoffAccepted === true,
      completeSignoffNegativeFixturesRejected: evidence.postgresExport.cutoverChecks?.completeSignoffNegativeFixturesRejected === true,
      includeSensitiveImportPlanValid: evidence.postgresExport.cutoverChecks?.includeSensitiveImportPlanValid === true,
      runtimeHealthReportsDatabaseBackend: evidence.postgresExport.cutoverChecks?.runtimeHealthReportsDatabaseBackend === true,
      runtimeHealthReportsWritableDatabase: evidence.postgresExport.cutoverChecks?.runtimeHealthReportsWritableDatabase === true,
      runtimeHealthReportsForeignKeys: evidence.postgresExport.cutoverChecks?.runtimeHealthReportsForeignKeys === true,
      completeSignoffRuntimeBackendAccepted: evidence.postgresExport.cutoverChecks?.completeSignoffRuntimeBackendAccepted === true,
      completeSignoffRuntimeHealthUrlRecorded: evidence.postgresExport.cutoverChecks?.completeSignoffRuntimeHealthUrlRecorded === true,
      runtimeBackendSqliteRejected: evidence.postgresExport.cutoverChecks?.runtimeBackendSqliteRejected === true,
      runtimeHealthUrlRawIpRejected: evidence.postgresExport.cutoverChecks?.runtimeHealthUrlRawIpRejected === true,
      runtimeHealthUrlQueryRejected: evidence.postgresExport.cutoverChecks?.runtimeHealthUrlQueryRejected === true,
      pendingStatusRejected: findResult(evidence.postgresExport.completeSignoffNegativeFixtures, "pending status rejected")?.rejected === true,
      localhostTargetHostRejected: findResult(evidence.postgresExport.completeSignoffNegativeFixtures, "localhost target host rejected")?.rejected === true,
      privateTargetHostRejected: evidence.postgresExport.cutoverChecks?.privateTargetHostRejected === true,
      publicIpTargetHostRejected: evidence.postgresExport.cutoverChecks?.publicIpTargetHostRejected === true,
      databaseDsnRejected: findResult(evidence.postgresExport.completeSignoffNegativeFixtures, "database DSN rejected")?.rejected === true,
      placeholderEvidenceUrlRejected: findResult(evidence.postgresExport.completeSignoffNegativeFixtures, "placeholder evidence URL rejected")?.rejected === true,
      privateEvidenceUrlRejected: evidence.postgresExport.cutoverChecks?.privateEvidenceUrlRejected === true,
      evidenceUrlRawIpRejected: evidence.postgresExport.cutoverChecks?.evidenceUrlRawIpRejected === true,
      targetHostWhitespaceRejected: evidence.postgresExport.cutoverChecks?.targetHostWhitespaceRejected === true,
      databaseUnsafeCharactersRejected: evidence.postgresExport.cutoverChecks?.databaseUnsafeCharactersRejected === true,
      evidenceUrlEmbeddedCredentialsRejected: evidence.postgresExport.cutoverChecks?.evidenceUrlEmbeddedCredentialsRejected === true,
      evidenceUrlQueryRejected: evidence.postgresExport.cutoverChecks?.evidenceUrlQueryRejected === true,
      futureCompletedTimestampRejected: evidence.postgresExport.cutoverChecks?.futureCompletedTimestampRejected === true,
      exportShaMismatchRejected: evidence.postgresExport.cutoverChecks?.exportShaMismatchRejected === true,
      sourceDbShaMismatchRejected: evidence.postgresExport.cutoverChecks?.sourceDbShaMismatchRejected === true,
      targetRowCountMismatchRejected: evidence.postgresExport.cutoverChecks?.targetRowCountMismatchRejected === true,
      inactiveAppDatabaseRejected: evidence.postgresExport.cutoverChecks?.inactiveAppDatabaseRejected === true,
      missingBackupConfirmationRejected: evidence.postgresExport.cutoverChecks?.missingBackupConfirmationRejected === true
    }
  },
  {
    id: "question-bank-public-commercial-rights",
    title: "Public/commercial source-rights approval",
    status: "blocked",
    ownerAction: "Record current per-source public/commercial approval evidence before any public or commercial distribution.",
    signoffCommand: "npm run check:question-bank-rights:public && npm run check:question-bank-rights:commercial",
    localCoverage: {
      releaseBlockersPass: evidence.rightsBlockers.status === "pass",
      releaseBlocked: evidence.rightsBlockers.releaseBlocked === true,
      publicBlockerCount: evidence.rightsBlockers.blockerSlugs?.public?.length || 0,
      commercialBlockerCount: evidence.rightsBlockers.blockerSlugs?.commercial?.length || 0,
      approvalPacketGenerated: evidence.rightsPacket.status === "pass",
      approvalPacketCoversActiveSources: evidence.rightsPacket.checks?.allActiveSourcesHavePackets === true,
      approvalPacketIncludesCommercialScope: evidence.rightsPacket.checks?.includesCommercialUseScope === true,
      approvalPacketIncludesSignoffCommand: evidence.rightsPacket.checks?.packetIncludesCompleteSignoffCommand === true,
      approvalPacketSignoffCommandRecorded: evidence.rightsPacket.signoffCommand === "npm run check:question-bank-rights:public && npm run check:question-bank-rights:commercial",
      approvalPacketIncludesReleaseBlockerCommand: evidence.rightsPacket.checks?.packetIncludesReleaseBlockerCommand === true,
      approvalPacketIncludesEvidenceUrlSafetyRules: evidence.rightsPacket.checks?.packetIncludesEvidenceUrlSafetyRules === true,
      approvalPacketIncludesRawIpEvidenceUrlRule: evidence.rightsPacket.checks?.packetIncludesRawIpEvidenceUrlRule === true,
      approvalPacketRequiresExternalPermissionGrantor: evidence.rightsPacket.checks?.packetRequiresExternalPermissionGrantor === true,
      approvalPacketSourcePacketCount: evidence.rightsPacket.sourcePacketCount || 0,
      approvalPacketSourcePacketsMatchBlockers: evidence.rightsPacket.checks?.releaseBlockersMatchPacketSources === true,
      approvalPacketDraftPlaceholders: evidence.rightsPacket.checks?.manifestDraftEntriesContainTodoPlaceholders === true,
      approvalPacketSourcePacketsIncludeOutreachAndDrafts: evidence.rightsPacket.checks?.sourcePacketsIncludeOutreachAndDrafts === true,
      publicSmokePass: evidence.rightsPublicSmoke.status === "pass",
      validPublicApprovalFixturePass: evidence.rightsPublicSmoke.checks?.validPublicPass === true,
      validCommercialApprovalFixturePass: evidence.rightsPublicSmoke.checks?.validCommercialPass === true,
      publicOnlyRejectedCommercial: evidence.rightsPublicSmoke.checks?.publicOnlyRejectedCommercial === true,
      publicOnlyCommercialMentionsScope: evidence.rightsPublicSmoke.checks?.publicOnlyCommercialMentionsScope === true,
      placeholderEvidenceRejected: evidence.rightsPublicSmoke.checks?.placeholderEvidenceRejected === true,
      privateEvidenceRejected: evidence.rightsPublicSmoke.checks?.privateEvidenceRejected === true,
      privateEvidenceMentionsPrivateNetwork: evidence.rightsPublicSmoke.checks?.privateEvidenceMentionsPrivateNetwork === true,
      rawIpEvidenceRejected: evidence.rightsPublicSmoke.checks?.rawIpEvidenceRejected === true,
      evidenceUrlEmbeddedCredentialsRejected: evidence.rightsPublicSmoke.checks?.evidenceUrlEmbeddedCredentialsRejected === true,
      evidenceUrlQueryRejected: evidence.rightsPublicSmoke.checks?.evidenceUrlQueryRejected === true,
      staleApprovalRejected: evidence.rightsPublicSmoke.checks?.staleApprovalRejected === true,
      missingGrantorRejected: evidence.rightsPublicSmoke.checks?.missingGrantorRejected === true,
      internalGrantorRejected: evidence.rightsPublicSmoke.checks?.internalGrantorRejected === true,
      internalGrantorMentionsExternalRightsHolder: evidence.rightsPublicSmoke.checks?.internalGrantorMentionsExternalRightsHolder === true,
      unsupportedScopeRejected: evidence.rightsPublicSmoke.checks?.unsupportedScopeRejected === true,
      noActivePublicCommercialApprovals: evidence.rightsBlockers.checks?.noActivePublicCommercialApprovals === true
    }
  },
  {
    id: "browser-journey-expansion",
    title: "Continue browser-executed journey coverage as beta risk emerges",
    status: "tracked",
    ownerAction: "Keep adding real browser journeys when beta usage reveals new high-risk cross-module paths.",
    signoffCommand: "npm run check:browser-route-smoke",
    localCoverage: {
      browserRouteSmokePass: evidence.browserRouteSmoke.status === "pass",
      routesChecked: evidence.browserRouteSmoke.routes?.checked || 0,
      interactionsChecked: evidence.browserRouteSmoke.interactions?.checked || 0,
      globalSearchKeyboardNavigationPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "global search keyboard navigation keeps moving through focused results"
        );
        return item?.status === "pass"
          && item.keyboardActivated === true
          && Number(item.resultCount || 0) >= 1;
      })(),
      deployedBetaSmokePass: evidence.deployedBetaSmoke.status === "pass",
      deployedBetaDeployReadinessPass: evidence.deployedBetaSmoke.deployReadiness?.status === "pass",
      deployedBetaDeployReadinessApiHealthPass: evidence.deployedBetaSmoke.deployReadiness?.apiHealth?.status === "pass",
      deployedBetaDeployReadinessCorsPass: evidence.deployedBetaSmoke.deployReadiness?.corsPreflight?.status === "pass",
      deployedBetaRoutesChecked: evidence.deployedBetaSmoke.routeSummary?.checked || 0,
      deployedBetaRoutesPass: Number(evidence.deployedBetaSmoke.routeSummary?.checked || 0) === 21
        && Number(evidence.deployedBetaSmoke.routeSummary?.passed || 0) === 21
        && Number(evidence.deployedBetaSmoke.routeSummary?.failed || 0) === 0,
      deployedBetaLoginPass: evidence.deployedBetaSmoke.checks?.loginPass === true
        && evidence.deployedBetaSmoke.checks?.loginEmailMatched === true
        && evidence.deployedBetaSmoke.checks?.cloudTokenPresent === true,
      deployedBetaProductionEndpointPass: evidence.deployedBetaSmoke.checks?.cloudEndpointIsProduction === true
        && evidence.deployedBetaSmoke.checks?.llmEndpointIsProduction === true
        && evidence.deployedBetaSmoke.checks?.googleLoginEnabled === true,
      deployedBetaCorsPreflightPass: evidence.deployedBetaSmoke.checks?.corsPreflightPass === true,
      deployedBetaPokerCorsPreflightPass: (evidence.deployedBetaSmoke.corsPreflights || []).some((item) => (
        item.name === "poker join preflight"
        && item.pass === true
        && item.originPass === true
        && item.methodPass === true
        && item.headersPass === true
      )),
      deployedBetaStaticAssetFallbackPass: evidence.deployedBetaSmoke.checks?.staticAssetFallbackPass === true
        && evidence.deployedBetaSmoke.staticAssetFallback?.status === 404
        && evidence.deployedBetaSmoke.staticAssetFallback?.notHtml200Pass === true
        && evidence.deployedBetaSmoke.staticAssetFallback?.noStorePass === true,
      deployedBetaSettingsCloudSyncSuccessPass: evidence.deployedBetaSmoke.checks?.deployedSettingsCloudSyncSuccessPass === true
        && evidence.deployedBetaSmoke.settingsCloudSync?.status === "pass"
        && evidence.deployedBetaSmoke.settingsCloudSync?.syncRequestCount === 1
        && evidence.deployedBetaSmoke.settingsCloudSync?.authorizationHeaderPresent === true
        && evidence.deployedBetaSmoke.settingsCloudSync?.payloadIncludesState === true
        && evidence.deployedBetaSmoke.settingsCloudSync?.payloadIncludesCommunity === true
        && evidence.deployedBetaSmoke.settingsCloudSync?.payloadIncludesAccount === true
        && evidence.deployedBetaSmoke.settingsCloudSync?.statusUpdated === true,
      deployedBetaErrorSweepPass: evidence.deployedBetaSmoke.checks?.noMaterialConsoleErrors === true
        && evidence.deployedBetaSmoke.checks?.noPageErrors === true
        && evidence.deployedBetaSmoke.checks?.noRequestFailures === true
        && evidence.deployedBetaSmoke.checks?.noHttpErrors === true,
      deployedBetaSummaryRedactedPass: evidence.deployedBetaSmoke.checks?.summaryRedacted === true,
      deployedBetaMobileContentPass: evidence.deployedBetaMobileContentSmoke.status === "pass",
      deployedBetaMobileContentCheckpointPass: Number(evidence.deployedBetaMobileContentSmoke.checkpoints?.length || 0) === 9
        && evidence.deployedBetaMobileContentSmoke.checks?.checkpointCountPass === true
        && evidence.deployedBetaMobileContentSmoke.checks?.allExpectedCheckpointsPresent === true,
      deployedBetaMobileContentExperiencePass: evidence.deployedBetaMobileContentSmoke.checks?.experienceSaved === true
        && evidence.deployedBetaMobileContentSmoke.checks?.experienceFilterUsable === true
        && evidence.deployedBetaMobileContentSmoke.checks?.experienceSharedToCommunity === true,
      deployedBetaMobileContentNewsPass: evidence.deployedBetaMobileContentSmoke.checks?.newsSubmitted === true
        && evidence.deployedBetaMobileContentSmoke.checks?.newsFiltersUsable === true
        && evidence.deployedBetaMobileContentSmoke.checks?.newsDetailReadPersisted === true,
      deployedBetaMobileContentErrorSweepPass: evidence.deployedBetaMobileContentSmoke.checks?.noMaterialConsoleErrors === true
        && evidence.deployedBetaMobileContentSmoke.checks?.noPageErrors === true
        && evidence.deployedBetaMobileContentSmoke.checks?.noRequestFailures === true
        && evidence.deployedBetaMobileContentSmoke.checks?.noHttpErrors === true
        && evidence.deployedBetaMobileContentSmoke.checks?.noHorizontalOverflow === true,
      deployedBetaMobileContentSummaryRedactedPass: evidence.deployedBetaMobileContentSmoke.checks?.summaryRedacted === true,
      authPasswordResetPass: evidence.browserRouteSmoke.unauthenticated?.localEmailAuth?.resetNewPasswordLoginSucceeded === true,
      accountNonAdminAdminRequestGuardPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "account non-admin cloud session avoids admin endpoint requests"
        );
        return item?.status === "pass"
          && item.adminRequestCount === 0
          && item.adminPanelHidden === true;
      })(),
      crossModuleJourneyPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "cross-module prep journey persists library, problem, todo, resume, and settings state"
      )?.status === "pass",
      planBaselineDiagnosticPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "plan baseline diagnostic completion and reload persistence"
        );
        return item?.status === "pass"
          && item.diagnosticCompleted === true
          && item.reloaded === true
          && Number(item.scoreRowCount || 0) > 0;
      })(),
      todoDockLifecyclePass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "todo dock edit, complete, delete, and reload persistence"
        );
        return item?.status === "pass"
          && item.edited === true
          && item.completed === true
          && item.reopened === true
          && item.reloaded === true
          && item.deleted === true
          && item.deletePersisted === true;
      })(),
      resumeLlmReviewPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "resume LLM review request, render, and reload persistence"
      )?.status === "pass",
      mobileResumeReviewPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "mobile resume review controls avoid overflow"
        );
        return item?.status === "pass"
          && item.mobileViewport === true
          && item.textareaUsable === true
          && item.reviewButtonsVisible === true
          && item.reviewRendered === true
          && item.requestPayloadSent === true
          && item.reviewPersisted === true
          && item.noHorizontalOverflow === true;
      })(),
      interviewAttachmentPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "interview attachment upload preview, transcript, and request payload"
        );
        return item?.status === "pass"
          && item.previewRendered === true
          && item.transcriptAttachmentRendered === true
          && item.requestAttachmentSent === true;
      })(),
      interviewPdfSourcePass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "interview PDF source upload generates questions and starts session"
        );
        return item?.status === "pass"
          && item.requestPdfPayloadSent === true
          && item.generatedQuestionRendered === true;
      })(),
      mobileInterviewAdvancedSetupPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "mobile interview advanced setup controls avoid overflow"
        );
        return item?.status === "pass"
          && item.mobileViewport === true
          && item.advancedOpened === true
          && item.technicalTypeSelected === true
          && item.optionCategorySelected === true
          && item.pdfSourceVisible === true
          && item.fullSourceRestored === true
          && item.noHorizontalOverflow === true;
      })(),
      accountEmailChangePass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "account local email change requires password and reauthenticates"
      )?.status === "pass",
      accountUploadPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "account avatar upload, clear, and resume file persistence"
      )?.status === "pass",
      accountAvatarClearPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "account avatar upload, clear, and resume file persistence"
      )?.avatarCleared === true,
      mobileAccountControlsPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "mobile account profile and upload controls avoid overflow"
        );
        return item?.status === "pass"
          && item.mobileViewport === true
          && item.formControlsVisible === true
          && item.securityFieldVisible === true
          && item.uploadControlsVisible === true
          && item.profilePersisted === true
          && item.resumeUploadPersisted === true
          && item.noHorizontalOverflow === true;
      })(),
      communityMediaPostPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "community image post fallback and reload persistence"
      )?.status === "pass",
      communityVideoPostPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "community video post fallback and reload persistence"
      )?.status === "pass",
      communityDirectMessagePass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "community direct message from post opens messages thread"
      )?.status === "pass",
      mobileSocialControlsPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "mobile community posting and messages controls avoid overflow"
        );
        return item?.status === "pass"
          && item.mobileViewport === true
          && item.communityComposerUsable === true
          && item.postLikeCommentPersisted === true
          && item.directMessageNavigated === true
          && item.messageReplyPersisted === true
          && item.messageReloadPersisted === true
          && item.noHorizontalOverflow === true;
      })(),
      messagesMultiThreadUnreadPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "messages multi-thread unread badges clear and persist read state"
        );
        return item?.status === "pass"
          && item.threadCount === 2
          && item.initialUnreadBadges === true
          && item.switchClearedBadges === true
          && item.readStatePersisted === true
          && item.repliesPersisted === true
          && item.reloaded === true;
      })(),
      mobileContentControlsPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "mobile news and experiences controls avoid overflow"
        );
        return item?.status === "pass"
          && item.mobileViewport === true
          && item.experienceSaved === true
          && item.experienceFilterUsable === true
          && item.experienceShared === true
          && item.newsSubmitted === true
          && item.newsFiltersUsable === true
          && item.newsDetailReadPersisted === true
          && item.noHorizontalOverflow === true;
      })(),
      memoryImageUploadPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "memory image resource upload fallback and reload persistence"
      )?.status === "pass",
      toolsMentalMathCompletionPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "tools mental math completes session and persists records"
      )?.status === "pass",
      toolsMarketGamePass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "tools market game rejects crossed quote, scores valid quote, and persists record"
      )?.status === "pass",
      pokerDefaultLocalNoAutoJoinPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "poker default route stays local until online action"
        );
        return item?.status === "pass"
          && item.joinRequests === 0
          && item.search === "";
      })(),
      pokerPreflopPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "poker preflop matrix position, hand selection, and leave-table navigation"
      )?.status === "pass",
      pokerLeaveTablePass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "poker preflop matrix position, hand selection, and leave-table navigation"
      )?.leaveTableNavigated === true,
      overviewLeaderboardPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "overview leaderboard controls and news ticker navigation"
      )?.status === "pass",
      streakCheckInCalendarPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "streak check-in calendar opens and persists activity"
        );
        return item?.status === "pass"
          && item.checkedIn === true
          && item.calendarOpened === true
          && item.todayLit === true
          && item.reloaded === true
          && item.persisted === true;
      })(),
      shellGlobalControlsPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "shell sidebar and command shortcuts persist navigation state"
        );
        return item?.status === "pass"
          && item.sidebarCollapsed === true
          && item.reloadPersisted === true
          && item.sidebarExpanded === true
          && item.chatShortcut === true
          && item.accountShortcut === true
          && item.settingsShortcut === true;
      })(),
      hashCompatDeepLinkPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "hash compat deep links redirect without losing query state"
        );
        return item?.status === "pass"
          && item.jobsPathname === "/jobs"
          && item.overviewAliasPathname === "/"
          && item.queryPreserved === true
          && item.hashCleared === true
          && item.jobsRendered === true
          && item.overviewRendered === true;
      })(),
      mobileShellControlsPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "mobile shell sidebar, search, and settings controls avoid overflow"
        );
        return item?.status === "pass"
          && item.mobileViewport === true
          && item.noHorizontalOverflow === true
          && item.searchUsable === true
          && item.compactActions === true
          && item.sidebarCollapsed === true
          && item.reloadPersisted === true
          && item.settingsShortcut === true;
      })(),
      mobileModuleNavPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "mobile module nav groups open problems and library routes"
        );
        return item?.status === "pass"
          && item.mobileViewport === true
          && item.trainingMenuOpened === true
          && item.problemsRoute === true
          && item.resourcesMenuOpened === true
          && item.libraryRoute === true
          && item.noHorizontalOverflow === true;
      })(),
      settingsRuntimeConfigPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "settings saves runtime config, clears Google Client ID, and reloads"
      )?.status === "pass",
      settingsCloudSyncGuardPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "settings sync cloud without session shows guarded status"
        );
        return item?.status === "pass"
          && item.noSessionGuardShown === true
          && item.syncRequestCount === 0
          && item.cloudTokenPresent === false;
      })(),
      settingsCloudSyncSuccessPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "settings sync cloud with session sends state and updates status"
        );
        return item?.status === "pass"
          && item.syncRequestCount === 1
          && item.authorizationHeaderPresent === true
          && item.payloadIncludesState === true
          && item.payloadIncludesCommunity === true
          && item.payloadIncludesAccount === true
          && item.statusUpdated === true;
      })(),
      settingsLanguageSwitchPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "settings language switch syncs URL and persists reload"
        );
        return item?.status === "pass"
          && item.englishSelected === true
          && item.englishUrlSynced === true
          && item.queryPreserved === true
          && item.englishReloadPersisted === true
          && item.zhRestored === true
          && item.statusMessageTranslated === true
          && item.appShellVisible === true;
      })(),
      settingsGoogleClientClearPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "settings saves runtime config, clears Google Client ID, and reloads"
      )?.googleClientIdCleared === true,
      settingsBackupPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "settings backup export, import, and reset state"
      )?.status === "pass",
      settingsCommunityBackupPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "settings backup restores community posts and messages"
        );
        return item?.status === "pass"
          && item.postRestored === true
          && item.threadRestored === true
          && item.existingPostPreserved === true
          && item.existingThreadPreserved === true
          && item.exportedPostIncluded === true
          && item.exportedThreadIncluded === true;
      })(),
      settingsInvalidBackupGuardPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "settings rejects invalid backup files without changing state"
        );
        return item?.status === "pass"
          && item.malformedJsonRejected === true
          && item.nonObjectJsonRejected === true
          && item.statePreserved === true;
      })(),
      mobileSettingsControlsPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "mobile settings config and backup controls avoid overflow"
        );
        return item?.status === "pass"
          && item.mobileViewport === true
          && item.formControlsVisible === true
          && item.dataActionsVisible === true
          && item.longConfigPersisted === true
          && item.exportDownloadWorks === true
          && item.noHorizontalOverflow === true;
      })(),
      libraryCloudPdfReaderPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "library cloud PDF reader opens, exposes links, and closes"
        );
        return item?.status === "pass"
          && item.readerOpened === true
          && item.closedByButton === true
          && item.closedByEscape === true
          && Number(item.readerTokenRequests || 0) >= 1
          && Number(item.pdfRequests || 0) >= 1;
      })(),
      problemsSocialGuardPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "problems social like/comment no-cloud guard"
      )?.status === "pass",
      problemsPaginationInterviewHandoffPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "problems pagination, collection filter, and mock interview handoff"
      )?.status === "pass",
      mobileProblemsDetailHandoffPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "mobile problems detail actions and mock handoff avoid overflow"
        );
        return item?.status === "pass"
          && item.mobileViewport === true
          && item.detailOpened === true
          && item.answerRevealed === true
          && item.saveToggled === true
          && item.interviewHandoff === true
          && item.noHorizontalOverflow === true;
      })(),
      problemsRankingNavigationPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "problems ranking view opens ranked detail and preserves ranking navigation"
        );
        return item?.status === "pass"
          && item.scoresDescending === true
          && item.rankingDetailPositionPass === true
          && item.returnedToRanking === true;
      })(),
      leetcodeHotTrackingPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "problems LeetCode Hot 100 tracking persistence"
      )?.status === "pass",
      mobileCareerControlsPass: (() => {
        const item = findResult(
          evidence.browserRouteSmoke.interactions?.results,
          "mobile career jobs and companies controls avoid overflow"
        );
        return item?.status === "pass"
          && item.mobileViewport === true
          && item.jobsFilterUsable === true
          && item.jobApplyLinkSafe === true
          && item.companiesFilterUsable === true
          && item.companyCareersLinkSafe === true
          && item.companyPracticeNavigated === true
          && item.noHorizontalOverflow === true;
      })()
    }
  }
];

for (const blocker of blockers) {
  for (const [key, value] of Object.entries(blocker.localCoverage || {})) {
    if (blocker.id === "apex-www-ssl" && [
      "apexCloudflare525Observed",
      "wwwCloudflare525Observed"
    ].includes(key)) {
      continue;
    }
    if (blocker.id === "deployed-google-provider-login" && [
      "deployedBoundaryLlmResumeReviewPass",
      "deployedBoundaryLlmPdfQuestionGenerationPass",
      "deployedBoundaryLlmResumeReviewSkippedForAuth",
      "deployedBoundaryLlmPdfQuestionGenerationSkippedForAuth",
      "deployedGoogleProviderLoginTokenFresh",
      "deployedGoogleProviderLoginTokenExpired",
      "deployedGoogleProviderLoginSkippedForToken"
    ].includes(key)) {
      continue;
    }
    if (blocker.id === "ops-alerts-edge-rate-limit" && [
      "productionSignoffSummaryPresent",
      "productionSignoffPass",
      "productionSignoffMode",
      "productionSignoffSmoke",
      "productionAlertWebhookHostSet",
      "productionAlertWebhookHttps",
      "productionEdgeProviderCloudflare",
      "productionEdgeEvidenceHostCloudflare",
      "productionWebhookSmokePass",
      "productionWebhookSmokeDelivered",
      "productionWebhookSmokeVerificationAcked"
    ].includes(key)) {
      continue;
    }
    if (typeof value === "boolean") {
      expect(value, `${blocker.id} local coverage check failed: ${key}.`);
    }
  }
}

const apexWwwBlocker = blockers.find((item) => item.id === "apex-www-ssl");
if (apexWwwBlocker?.status === "blocked") {
  expect(
    apexWwwBlocker.localCoverage?.apexPromotionHostBlocked === true
      && apexWwwBlocker.localCoverage?.wwwPromotionHostBlocked === true,
    "apex-www-ssl blocked state requires blocked promotion-host evidence for both apex and WWW."
  );
}

const deployedGoogleBlocker = blockers.find((item) => item.id === "deployed-google-provider-login");
if (deployedGoogleBlocker?.status === "pass") {
  expect(
    deployedGoogleBlocker.localCoverage?.deployedGoogleProviderLoginTokenFresh === true
      && deployedGoogleBlocker.localCoverage?.deployedGoogleProviderLoginTokenExpired === false,
    "deployed-google-provider-login pass requires fresh, unexpired token evidence."
  );
  expect(
    deployedGoogleBlocker.localCoverage?.deployedBoundaryLlmResumeReviewPass === true
      && deployedGoogleBlocker.localCoverage?.deployedBoundaryLlmPdfQuestionGenerationPass === true,
    "deployed-google-provider-login pass requires deployed LLM resume and PDF checks to pass."
  );
} else {
  expect(
    deployedGoogleBlocker?.localCoverage?.deployedGoogleProviderLoginTokenFresh === false
      && (
        deployedGoogleBlocker?.localCoverage?.deployedGoogleProviderLoginTokenExpired === true
          || deployedGoogleBlocker?.localCoverage?.deployedGoogleProviderLoginSkippedForToken === true
    ),
    "deployed-google-provider-login blocked state requires expired-token or missing-token evidence."
  );
  expect(
    (
      deployedGoogleBlocker?.localCoverage?.deployedBoundaryLlmResumeReviewPass === true
        || deployedGoogleBlocker?.localCoverage?.deployedBoundaryLlmResumeReviewSkippedForAuth === true
    )
      && (
        deployedGoogleBlocker?.localCoverage?.deployedBoundaryLlmPdfQuestionGenerationPass === true
          || deployedGoogleBlocker?.localCoverage?.deployedBoundaryLlmPdfQuestionGenerationSkippedForAuth === true
      ),
    "deployed-google-provider-login blocked state requires deployed LLM pass evidence or explicit auth-token skip evidence."
  );
}

const opsAlertBlocker = blockers.find((item) => item.id === "ops-alerts-edge-rate-limit");
if (opsAlertBlocker?.status === "pass") {
  expect(
    opsAlertBlocker.localCoverage?.productionSignoffPass === true
      && opsAlertBlocker.localCoverage?.productionSignoffMode === true
      && opsAlertBlocker.localCoverage?.productionSignoffSmoke === true,
    "ops-alerts-edge-rate-limit pass requires production config plus smoke signoff evidence."
  );
  expect(
    opsAlertBlocker.localCoverage?.productionWebhookSmokePass === true
      && opsAlertBlocker.localCoverage?.productionWebhookSmokeDelivered === true
      && opsAlertBlocker.localCoverage?.productionWebhookSmokeVerificationAcked === true,
    "ops-alerts-edge-rate-limit pass requires verified webhook-smoke delivery evidence."
  );
  expect(
    opsAlertBlocker.localCoverage?.productionEdgeProviderCloudflare === true
      && opsAlertBlocker.localCoverage?.productionEdgeEvidenceHostCloudflare === true,
    "ops-alerts-edge-rate-limit pass requires Cloudflare edge evidence."
  );
} else {
  expect(
    opsAlertBlocker?.localCoverage?.productionSignoffPass !== true
      || opsAlertBlocker?.localCoverage?.productionWebhookSmokePass !== true,
    "ops-alerts-edge-rate-limit blocked state should not contain a complete production smoke signoff."
  );
}

if (!skipReleaseSummaryContent) {
  expect(
    findResult(evidence.releaseReadiness.results, "Question-bank rights release blockers")?.status === "pass",
    "release readiness must include the question-bank rights release-blocker gate."
  );
  expect(
    findResult(evidence.releaseReadiness.results, "Chrome store publication fixture")?.status === "pass",
    "release readiness must include the Chrome store publication fixture gate."
  );
  expect(
    findResult(evidence.releaseReadiness.results, "Render API build filter fixture")?.status === "pass",
    "release readiness must include the Render API build filter fixture gate."
  );
  expect(
    findResult(evidence.releaseReadiness.results, "Render API build filter packet")?.status === "pass",
    "release readiness must include the Render API build filter packet gate."
  );
  expect(
    findResult(evidence.releaseReadiness.results, "External launch blockers")?.status === "pass",
    "release readiness must include the external launch blockers gate."
  );
}

const blocking = blockers.filter((item) => item.status === "blocked");
if (requireClear && blocking.length) {
  failures.push(`External launch blockers remain: ${blocking.map((item) => item.id).join(", ")}`);
}

const summary = {
  id: 341,
  date: "2026-06-19",
  surface: "external launch blockers",
  status: failures.length ? "fail" : "pass",
  launchReadiness: blocking.length ? "blocked" : "pass",
  requireClear,
  blockerCount: blocking.length,
  trackedCount: blockers.filter((item) => item.status === "tracked").length,
  blockers,
  checks: {
    requiredScriptsPresent: requiredScripts.every((name) => Boolean(scripts[name])),
    outstandingItemsTracked: outstandingItems.length >= 9,
    renderApiBuildFilterFixturePass: evidence.renderApiBuildFilterFixture.status === "pass",
    renderApiBuildFilterPacketPass: evidence.renderApiBuildFilterPacket.status === "pass",
    renderApiBuildFilterPathsExact: evidence.renderApiBuildFilterPacket.checks?.includesExactRecommendedPaths === true
      && evidence.renderApiBuildFilterFixture.localCoverage?.validProductionBuildFilterAccepted === true,
    renderApiBuildFilterCliCovered: evidence.renderApiBuildFilterPacket.checks?.includesCliInstructions === true
      && evidence.renderApiBuildFilterFixture.localCoverage?.cliProductionBuildFilterAccepted === true,
    renderApiBuildFilterProductionPass: renderApiBuildFilterProductionCleared,
    releaseReadinessIncludesExternalFixtures: skipReleaseSummaryContent ? "skipped" : true,
    releaseReadinessIncludesExternalBlockerGate: skipReleaseSummaryContent ? "skipped" : true,
    skippedReleaseSummaryContent: skipReleaseSummaryContent,
    requireClearWouldFail: blocking.length > 0,
    browserDeployedBetaSmokePass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.deployedBetaSmokePass === true,
    browserDeployedBetaLoginPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.deployedBetaLoginPass === true,
    browserDeployedBetaRouteSweepPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.deployedBetaRoutesPass === true,
    browserDeployedBetaErrorSweepPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.deployedBetaErrorSweepPass === true,
    browserDeployedBetaStaticAssetFallbackPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.deployedBetaStaticAssetFallbackPass === true,
    browserDeployedBetaSettingsCloudSyncSuccessPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.deployedBetaSettingsCloudSyncSuccessPass === true,
    browserDeployedBetaMobileContentPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.deployedBetaMobileContentPass === true,
    browserDeployedBetaMobileContentCheckpointPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.deployedBetaMobileContentCheckpointPass === true,
    browserDeployedBetaMobileContentExperiencePass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.deployedBetaMobileContentExperiencePass === true,
    browserDeployedBetaMobileContentNewsPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.deployedBetaMobileContentNewsPass === true,
    browserDeployedBetaMobileContentErrorSweepPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.deployedBetaMobileContentErrorSweepPass === true,
    browserDeployedBetaMobileContentSummaryRedactedPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.deployedBetaMobileContentSummaryRedactedPass === true,
    browserAuthPasswordResetPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.authPasswordResetPass === true,
    browserGlobalSearchKeyboardNavigationPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.globalSearchKeyboardNavigationPass === true,
    browserAccountNonAdminAdminRequestGuardPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.accountNonAdminAdminRequestGuardPass === true,
    browserCrossModuleJourneyPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.crossModuleJourneyPass === true,
    browserPlanBaselineDiagnosticPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.planBaselineDiagnosticPass === true,
    browserTodoDockLifecyclePass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.todoDockLifecyclePass === true,
    browserResumeLlmReviewPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.resumeLlmReviewPass === true,
    browserMobileResumeReviewPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.mobileResumeReviewPass === true,
    browserInterviewAttachmentPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.interviewAttachmentPass === true,
    browserInterviewPdfSourcePass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.interviewPdfSourcePass === true,
    browserMobileInterviewAdvancedSetupPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.mobileInterviewAdvancedSetupPass === true,
    browserAccountEmailChangePass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.accountEmailChangePass === true,
    browserAccountUploadPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.accountUploadPass === true,
    browserAccountAvatarClearPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.accountAvatarClearPass === true,
    browserMobileAccountControlsPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.mobileAccountControlsPass === true,
    browserCommunityMediaPostPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.communityMediaPostPass === true,
    browserCommunityVideoPostPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.communityVideoPostPass === true,
    browserCommunityDirectMessagePass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.communityDirectMessagePass === true,
    browserMobileSocialControlsPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.mobileSocialControlsPass === true,
    browserMessagesMultiThreadUnreadPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.messagesMultiThreadUnreadPass === true,
    browserMobileContentControlsPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.mobileContentControlsPass === true,
    browserMemoryImageUploadPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.memoryImageUploadPass === true,
    browserToolsMentalMathCompletionPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.toolsMentalMathCompletionPass === true,
    browserToolsMarketGamePass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.toolsMarketGamePass === true,
    browserPokerDefaultLocalNoAutoJoinPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.pokerDefaultLocalNoAutoJoinPass === true,
    browserPokerPreflopPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.pokerPreflopPass === true,
    browserPokerLeaveTablePass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.pokerLeaveTablePass === true,
    browserOverviewLeaderboardPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.overviewLeaderboardPass === true,
    browserStreakCheckInCalendarPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.streakCheckInCalendarPass === true,
    browserShellGlobalControlsPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.shellGlobalControlsPass === true,
    browserHashCompatDeepLinkPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.hashCompatDeepLinkPass === true,
    browserMobileShellControlsPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.mobileShellControlsPass === true,
    browserMobileModuleNavPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.mobileModuleNavPass === true,
    browserSettingsRuntimeConfigPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.settingsRuntimeConfigPass === true,
    browserSettingsCloudSyncGuardPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.settingsCloudSyncGuardPass === true,
    browserSettingsCloudSyncSuccessPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.settingsCloudSyncSuccessPass === true,
    browserSettingsLanguageSwitchPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.settingsLanguageSwitchPass === true,
    browserSettingsGoogleClientClearPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.settingsGoogleClientClearPass === true,
    browserSettingsBackupPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.settingsBackupPass === true,
    browserSettingsCommunityBackupPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.settingsCommunityBackupPass === true,
    browserSettingsInvalidBackupGuardPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.settingsInvalidBackupGuardPass === true,
    browserMobileSettingsControlsPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.mobileSettingsControlsPass === true,
    browserLibraryCloudPdfReaderPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.libraryCloudPdfReaderPass === true,
    browserProblemsSocialGuardPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.problemsSocialGuardPass === true,
    browserProblemsPaginationInterviewHandoffPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.problemsPaginationInterviewHandoffPass === true,
    browserMobileProblemsDetailHandoffPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.mobileProblemsDetailHandoffPass === true,
    browserProblemsRankingNavigationPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.problemsRankingNavigationPass === true,
    browserLeetcodeHotTrackingPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.leetcodeHotTrackingPass === true,
    browserMobileCareerControlsPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.mobileCareerControlsPass === true
  },
  failures,
  warnings
};

if ((!requireClear && !skipReleaseSummaryContent) || summaryRequested) writeSummary(summary);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (failures.length) process.exitCode = 1;

function writeSummary(summary) {
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function extractOutstandingItems(text) {
  const section = String(text || "").split("## Outstanding Items")[1]?.split("## Recommended Next Steps")[0] || "";
  return [...section.matchAll(/^(\d+)\.\s+(.+)$/gm)].map((match) => ({
    index: Number(match[1]),
    text: match[2]
  }));
}

function productStatusIncludes(needles) {
  return needles.every((needle) => productStatusText.includes(needle));
}

function findResult(items, name) {
  return Array.isArray(items) ? items.find((item) => item.name === name) : undefined;
}

function findHostSummary(items, host) {
  return Array.isArray(items) ? items.find((item) => item.host === host) : undefined;
}

function secondsUntil(isoTimestamp) {
  const value = String(isoTimestamp || "").trim();
  if (!value) return null;
  const timestampMs = Date.parse(value);
  if (!Number.isFinite(timestampMs)) return null;
  return Math.floor((timestampMs - Date.now()) / 1000);
}

function readJson(relativePath, label) {
  const absolutePath = path.join(root, relativePath);
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    failures.push(`${label} is not valid JSON: ${error.message}`);
    return {};
  }
}

function readJsonOptional(relativePath, label) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    failures.push(`${label} is not valid JSON: ${error.message}`);
    return {};
  }
}

function readText(relativePath, label) {
  const absolutePath = path.join(root, relativePath);
  try {
    return fs.readFileSync(absolutePath, "utf8");
  } catch (error) {
    failures.push(`${label} is not readable: ${error.message}`);
    return "";
  }
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") {
      parsed.root = argv[index + 1];
      index += 1;
    } else if (value === "--summary") {
      parsed.summary = argv[index + 1];
      index += 1;
    } else if (value === "--require-clear") {
      parsed.requireClear = true;
    } else if (value === "--skip-release-summary-content") {
      parsed.skipReleaseSummaryContent = true;
    }
  }
  return parsed;
}
