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

const evidence = {
  opsRuntime: readJson("docs/browser-audit-screenshots/334-ops-alert-runtime-smoke-summary.json", "ops alert runtime smoke"),
  opsFixture: readJson("docs/browser-audit-screenshots/336-ops-alert-production-fixture-summary.json", "ops alert production fixture"),
  opsPacket: readJson("docs/browser-audit-screenshots/346-ops-alert-edge-packet-summary.json", "ops alert edge packet"),
  mediaRuntime: readJson("docs/browser-audit-screenshots/329-media-storage-runtime-smoke-summary.json", "media storage runtime smoke"),
  mediaFixture: readJson("docs/browser-audit-screenshots/337-media-storage-production-fixture-summary.json", "media storage production fixture"),
  mediaPacket: readJson("docs/browser-audit-screenshots/347-media-storage-packet-summary.json", "media storage readiness packet"),
  jobsRuntime: readJson("docs/browser-audit-screenshots/330-jobs-source-runtime-smoke-summary.json", "jobs source runtime smoke"),
  jobsFixture: readJson("docs/browser-audit-screenshots/338-jobs-source-production-fixture-summary.json", "jobs source production fixture"),
  jobsPacket: readJson("docs/browser-audit-screenshots/349-jobs-feed-publication-packet-summary.json", "jobs feed publication packet"),
  chromeFixture: readJson("docs/browser-audit-screenshots/339-chrome-store-publication-fixture-summary.json", "Chrome store publication fixture"),
  chromePacket: readJson("docs/browser-audit-screenshots/348-chrome-store-publication-packet-summary.json", "Chrome store publication packet"),
  postgresExport: readJson("docs/browser-audit-screenshots/331-postgres-cutover-export-smoke-summary.json", "Postgres cutover export smoke"),
  postgresPacket: readJson("docs/browser-audit-screenshots/350-postgres-cutover-packet-summary.json", "Postgres cutover readiness packet"),
  rightsPublicSmoke: readJson("docs/browser-audit-screenshots/335-question-bank-rights-public-smoke-summary.json", "question-bank rights public smoke"),
  rightsBlockers: readJson("docs/browser-audit-screenshots/340-question-bank-rights-release-blockers-summary.json", "question-bank rights release blockers"),
  rightsPacket: readJson("docs/browser-audit-screenshots/345-question-bank-rights-packet-summary.json", "question-bank rights approval packet"),
  browserRouteSmoke: readJson("docs/browser-audit-screenshots/328-browser-route-smoke-summary.json", "browser route smoke"),
  releaseReadiness: skipReleaseSummaryContent
    ? { results: [] }
    : readJson("docs/browser-audit-screenshots/323-release-readiness-summary.json", "release readiness")
};

const scripts = packageJson.scripts || {};
const requiredScripts = [
  "check:ops-alerts:production",
  "build:ops-alert-edge-packet",
  "check:media-storage:production",
  "build:media-storage-packet",
  "check:jobs-source:production",
  "build:jobs-feed:publication-packet",
  "check:chrome-store-publication:published",
  "build:chrome-store-publication-packet",
  "check:postgres-cutover:complete",
  "build:postgres-cutover-packet",
  "check:question-bank-rights:public",
  "check:question-bank-rights:commercial",
  "build:question-bank-rights-packet",
  "check:browser-route-smoke"
];

for (const name of requiredScripts) {
  expect(Boolean(scripts[name]), `package.json is missing ${name}.`);
}

const outstandingItems = extractOutstandingItems(productStatusText);
for (let index = 1; index <= 8; index += 1) {
  expect(outstandingItems.some((item) => item.index === index), `docs/product-status.md is missing Outstanding Item ${index}.`);
}

const blockers = [
  {
    id: "apex-www-ssl",
    title: "Apex/WWW domain SSL or redirect",
    status: "blocked",
    ownerAction: "Fix Cloudflare/origin SSL handshakes or intentionally redirect quantgym.app and www.quantgym.app before promoting those domains.",
    signoffCommand: "",
    localCoverage: {
      trackedInProductStatus: productStatusIncludes(["quantgym.app", "www.quantgym.app", "525"])
    }
  },
  {
    id: "ops-alerts-edge-rate-limit",
    title: "Production alert receiver and edge rate limits",
    status: "blocked",
    ownerAction: "Configure the real alert receiver and edge rate limits, then run the production signoff command with real provider, notes, and HTTPS evidence URL.",
    signoffCommand: "npm run check:ops-alerts:production",
    localCoverage: {
      runtimeSmokePass: evidence.opsRuntime.status === "pass",
      productionFixturePass: evidence.opsFixture.status === "pass",
      readinessPacketGenerated: evidence.opsPacket.status === "pass",
      packetIncludesProductionEnvTemplate: evidence.opsPacket.checks?.includesProductionEnvTemplate === true,
      packetIncludesWebhookContract: evidence.opsPacket.checks?.includesWebhookContract === true,
      packetIncludesCloudflareRuleRunbook: evidence.opsPacket.checks?.includesCloudflareRuleRunbook === true,
      packetIncludesSignoffChecklist: evidence.opsPacket.checks?.includesSignoffChecklist === true,
      packetUsesPlaceholderOnlyForToken: evidence.opsPacket.checks?.usesPlaceholderOnlyForToken === true,
      localWebhookSmokeDelivered: evidence.opsFixture.checks?.localWebhookSmokeDelivered === true,
      shortWebhookTokenRejected: evidence.opsFixture.checks?.shortWebhookTokenRejected === true,
      placeholderWebhookTokenRejected: evidence.opsFixture.checks?.placeholderWebhookTokenRejected === true,
      privateWebhookRejected: findResult(evidence.opsFixture.negativeFixtures, "private webhook rejected")?.rejected === true,
      privateEdgeEvidenceRejected: findResult(evidence.opsFixture.negativeFixtures, "private edge evidence rejected")?.rejected === true
    }
  },
  {
    id: "media-bucket-cdn",
    title: "Production S3/R2 media bucket and CDN",
    status: "blocked",
    ownerAction: "Configure the real object bucket and public CDN/base URL, then run the live media storage signoff.",
    signoffCommand: "npm run check:media-storage:production -- --live",
    localCoverage: {
      runtimeSmokePass: evidence.mediaRuntime.status === "pass",
      productionFixturePass: evidence.mediaFixture.status === "pass",
      readinessPacketGenerated: evidence.mediaPacket.status === "pass",
      packetIncludesProductionEnvTemplate: evidence.mediaPacket.checks?.includesProductionEnvTemplate === true,
      packetIncludesBucketCdnRunbook: evidence.mediaPacket.checks?.includesBucketCdnRunbook === true,
      packetIncludesObjectStorageContract: evidence.mediaPacket.checks?.includesObjectStorageContract === true,
      packetIncludesLiveSmokeChecklist: evidence.mediaPacket.checks?.includesLiveSmokeChecklist === true,
      packetUsesPlaceholderOnlyForSecrets: evidence.mediaPacket.checks?.usesPlaceholderOnlyForSecrets === true,
      privateObjectEndpointRejected: findResult(evidence.mediaFixture.negativeFixtures, "private object endpoint rejected")?.rejected === true,
      privatePublicBaseRejected: findResult(evidence.mediaFixture.negativeFixtures, "private public base rejected")?.rejected === true,
      endpointEmbeddedCredentialsRejected: evidence.mediaFixture.checks?.endpointEmbeddedCredentialsRejected === true,
      publicBaseQueryRejected: evidence.mediaFixture.checks?.publicBaseQueryRejected === true,
      placeholderAccessKeyRejected: evidence.mediaFixture.checks?.placeholderAccessKeyRejected === true,
      shortSecretKeyRejected: evidence.mediaFixture.checks?.shortSecretKeyRejected === true,
      unsafeBucketNameRejected: evidence.mediaFixture.checks?.unsafeBucketNameRejected === true,
      unsafeObjectPrefixRejected: evidence.mediaFixture.checks?.unsafeObjectPrefixRejected === true,
      liveFixturePass: evidence.mediaFixture.checks?.liveFixturePutGetPublicDelete === true,
      liveCleanupPass: evidence.mediaFixture.checks?.liveFailureCleanedUp === true
    }
  },
  {
    id: "jobs-real-feed",
    title: "Real internship/full-time jobs feed",
    status: "blocked",
    ownerAction: "Configure and operate a real crawler or vendor feed, then run the live jobs-source signoff.",
    signoffCommand: "npm run check:jobs-source:production -- --live",
    localCoverage: {
      runtimeSmokePass: evidence.jobsRuntime.status === "pass",
      productionFixturePass: evidence.jobsFixture.status === "pass",
      readinessPacketGenerated: evidence.jobsPacket.status === "pass",
      packetGeneratedFeedSnapshot: evidence.jobsPacket.checks?.generatedFeedSnapshotWritten === true,
      packetGeneratedFeedShaMatches: evidence.jobsPacket.checks?.generatedFeedShaMatches === true,
      packetGeneratedFeedIncludesInternshipAndFulltime: evidence.jobsPacket.checks?.generatedFeedIncludesInternshipAndFulltime === true,
      packetGeneratedFeedHasRealMetadata: evidence.jobsPacket.checks?.generatedFeedHasRealMetadata === true,
      packetIncludesProductionEnvTemplate: evidence.jobsPacket.checks?.includesProductionEnvTemplate === true,
      packetIncludesHostingRunbook: evidence.jobsPacket.checks?.includesHostingRunbook === true,
      packetIncludesLiveSignoffChecklist: evidence.jobsPacket.checks?.includesLiveSignoffChecklist === true,
      privateSourceUrlRejected: findResult(evidence.jobsFixture.negativeFixtures, "private source URL rejected")?.rejected === true,
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
      packetUsesPlaceholdersForPublishedIds: evidence.chromePacket.checks?.usesPlaceholdersForPublishedIds === true,
      externalPublicationStillRequired: evidence.chromeFixture.checks?.externalPublicationStillRequired === true,
      privateEvidenceUrlRejected: findResult(evidence.chromeFixture.negativeFixtures, "private evidence URL rejected")?.rejected === true,
      placeholderItemIdRejected: evidence.chromeFixture.checks?.placeholderItemIdRejected === true,
      listingUrlEmbeddedCredentialsRejected: evidence.chromeFixture.checks?.listingUrlEmbeddedCredentialsRejected === true,
      listingUrlQueryRejected: evidence.chromeFixture.checks?.listingUrlQueryRejected === true,
      listingUrlDetailPathRejected: evidence.chromeFixture.checks?.listingUrlDetailPathRejected === true,
      evidenceUrlEmbeddedCredentialsRejected: evidence.chromeFixture.checks?.evidenceUrlEmbeddedCredentialsRejected === true,
      evidenceUrlQueryRejected: evidence.chromeFixture.checks?.evidenceUrlQueryRejected === true,
      finalSignoffCommandRecorded: evidence.chromeFixture.finalSignoffCommand === "npm run check:chrome-store-publication:published"
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
      completeSignoffPositiveFixturePass: evidence.postgresExport.cutoverChecks?.completeSignoffAccepted === true,
      completeSignoffNegativeFixturesRejected: evidence.postgresExport.cutoverChecks?.completeSignoffNegativeFixturesRejected === true,
      privateTargetHostRejected: evidence.postgresExport.cutoverChecks?.privateTargetHostRejected === true,
      privateEvidenceUrlRejected: evidence.postgresExport.cutoverChecks?.privateEvidenceUrlRejected === true,
      targetHostWhitespaceRejected: evidence.postgresExport.cutoverChecks?.targetHostWhitespaceRejected === true,
      databaseUnsafeCharactersRejected: evidence.postgresExport.cutoverChecks?.databaseUnsafeCharactersRejected === true,
      evidenceUrlEmbeddedCredentialsRejected: evidence.postgresExport.cutoverChecks?.evidenceUrlEmbeddedCredentialsRejected === true,
      evidenceUrlQueryRejected: evidence.postgresExport.cutoverChecks?.evidenceUrlQueryRejected === true
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
      publicSmokePass: evidence.rightsPublicSmoke.status === "pass",
      privateEvidenceRejected: evidence.rightsPublicSmoke.checks?.privateEvidenceRejected === true,
      evidenceUrlEmbeddedCredentialsRejected: evidence.rightsPublicSmoke.checks?.evidenceUrlEmbeddedCredentialsRejected === true,
      evidenceUrlQueryRejected: evidence.rightsPublicSmoke.checks?.evidenceUrlQueryRejected === true,
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
      authPasswordResetPass: evidence.browserRouteSmoke.unauthenticated?.localEmailAuth?.resetNewPasswordLoginSucceeded === true,
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
      settingsGoogleClientClearPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "settings saves runtime config, clears Google Client ID, and reloads"
      )?.googleClientIdCleared === true,
      settingsBackupPass: findResult(
        evidence.browserRouteSmoke.interactions?.results,
        "settings backup export, import, and reset state"
      )?.status === "pass",
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
      )?.status === "pass"
    }
  }
];

for (const blocker of blockers) {
  for (const [key, value] of Object.entries(blocker.localCoverage || {})) {
    if (typeof value === "boolean") {
      expect(value, `${blocker.id} local coverage check failed: ${key}.`);
    }
  }
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
  date: "2026-06-18",
  surface: "external launch blockers",
  status: failures.length ? "fail" : "pass",
  launchReadiness: blocking.length ? "blocked" : "pass",
  requireClear,
  blockerCount: blocking.length,
  trackedCount: blockers.filter((item) => item.status === "tracked").length,
  blockers,
  checks: {
    requiredScriptsPresent: requiredScripts.every((name) => Boolean(scripts[name])),
    outstandingItemsTracked: outstandingItems.length >= 8,
    releaseReadinessIncludesExternalFixtures: skipReleaseSummaryContent ? "skipped" : true,
    releaseReadinessIncludesExternalBlockerGate: skipReleaseSummaryContent ? "skipped" : true,
    skippedReleaseSummaryContent: skipReleaseSummaryContent,
    requireClearWouldFail: blocking.length > 0,
    browserAuthPasswordResetPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.authPasswordResetPass === true,
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
    browserMessagesMultiThreadUnreadPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.messagesMultiThreadUnreadPass === true,
    browserMemoryImageUploadPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.memoryImageUploadPass === true,
    browserToolsMentalMathCompletionPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.toolsMentalMathCompletionPass === true,
    browserToolsMarketGamePass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.toolsMarketGamePass === true,
    browserPokerPreflopPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.pokerPreflopPass === true,
    browserPokerLeaveTablePass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.pokerLeaveTablePass === true,
    browserOverviewLeaderboardPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.overviewLeaderboardPass === true,
    browserStreakCheckInCalendarPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.streakCheckInCalendarPass === true,
    browserShellGlobalControlsPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.shellGlobalControlsPass === true,
    browserMobileShellControlsPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.mobileShellControlsPass === true,
    browserMobileModuleNavPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.mobileModuleNavPass === true,
    browserSettingsRuntimeConfigPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.settingsRuntimeConfigPass === true,
    browserSettingsGoogleClientClearPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.settingsGoogleClientClearPass === true,
    browserSettingsBackupPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.settingsBackupPass === true,
    browserSettingsInvalidBackupGuardPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.settingsInvalidBackupGuardPass === true,
    browserMobileSettingsControlsPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.mobileSettingsControlsPass === true,
    browserLibraryCloudPdfReaderPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.libraryCloudPdfReaderPass === true,
    browserProblemsSocialGuardPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.problemsSocialGuardPass === true,
    browserProblemsPaginationInterviewHandoffPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.problemsPaginationInterviewHandoffPass === true,
    browserMobileProblemsDetailHandoffPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.mobileProblemsDetailHandoffPass === true,
    browserProblemsRankingNavigationPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.problemsRankingNavigationPass === true,
    browserLeetcodeHotTrackingPass: blockers.find((item) => item.id === "browser-journey-expansion")?.localCoverage?.leetcodeHotTrackingPass === true
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

function readJson(relativePath, label) {
  const absolutePath = path.join(root, relativePath);
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
