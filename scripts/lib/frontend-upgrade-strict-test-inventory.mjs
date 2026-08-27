import { createHash } from "node:crypto";

export const STRICT_VITEST_V2_TEST_COUNT = 761;
export const STRICT_VITEST_V2_SUITE_COUNT = 193;
export const STRICT_VITEST_V2_FILE_COUNT = 91;
export const STRICT_API_PYTEST_TEST_COUNT = 480;
export const STRICT_PHASE1_UNITTEST_TEST_COUNT = 15;
export const STRICT_PHASE1_NODE_TEST_COUNT = 315;
export const STRICT_PHASE2_NODE_TEST_COUNT = 311;
export const STRICT_DESIGN_SYSTEM_NODE_TEST_COUNT = 15;
export const STRICT_BUILD_ISOLATION_NODE_TEST_COUNT = 13;
export const STRICT_PHASE2_CONTRACT_COMMAND_COUNT = 21;

export const STRICT_VITEST_V2_TEST_FILES = Object.freeze([
  "src/core/errors/AppErrorBoundary.test.tsx",
  "src/core/providers/PreferenceDocumentSync.test.tsx",
  "src/core/providers/QueryProvider.test.ts",
  "src/core/router/AuthenticatedPlatformShell.integration.test.tsx",
  "src/core/router/AuthenticatedShellRoute.integration.test.tsx",
  "src/core/router/businessRouteOwnership.test.ts",
  "src/core/router/router.test.tsx",
  "src/design-system/patterns/AccountMenu/AccountMenu.test.tsx",
  "src/design-system/patterns/AppShell/AppShell.test.tsx",
  "src/design-system/patterns/DashboardTemplate/DashboardTemplate.test.tsx",
  "src/design-system/patterns/DraftStatus/DraftStatus.test.tsx",
  "src/design-system/patterns/EmptyState/EmptyState.test.tsx",
  "src/design-system/patterns/FilterBar/FilterBar.test.tsx",
  "src/design-system/patterns/ListDetail/ListDetail.test.tsx",
  "src/design-system/patterns/Metric/Metric.test.tsx",
  "src/design-system/patterns/MobileDrawer/MobileDrawer.test.tsx",
  "src/design-system/patterns/NetworkBanner/NetworkBanner.test.tsx",
  "src/design-system/patterns/Pagination/Pagination.test.tsx",
  "src/design-system/patterns/QuantyImage/QuantyImage.test.tsx",
  "src/design-system/patterns/RecoveryPanel/RecoveryPanel.test.tsx",
  "src/design-system/patterns/ResultSummary/ResultSummary.test.tsx",
  "src/design-system/patterns/ToastRegion/ToastRegion.test.tsx",
  "src/design-system/patterns/WorkflowBoard/WorkflowBoard.test.tsx",
  "src/design-system/primitives/Alert/Alert.test.tsx",
  "src/design-system/primitives/Button/Button.test.tsx",
  "src/design-system/primitives/Dialog/Dialog.test.tsx",
  "src/design-system/primitives/Drawer/Drawer.test.tsx",
  "src/design-system/primitives/Skeleton/Skeleton.test.tsx",
  "src/design-system/primitives/Spinner/Spinner.test.tsx",
  "src/design-system/primitives/Tabs/Tabs.test.tsx",
  "src/design-system/primitives/TextField/TextField.test.tsx",
  "src/domains/account/auth/AuthFrame.test.tsx",
  "src/domains/account/auth/AuthRecovery.test.tsx",
  "src/domains/account/auth/EmailAuthForm.test.tsx",
  "src/domains/account/auth/auth.integration.test.ts",
  "src/domains/account/auth/auth.mutations.test.tsx",
  "src/domains/account/auth/auth.queries.test.ts",
  "src/domains/account/auth/auth.routing.test.ts",
  "src/domains/account/auth/auth.schema.test.ts",
  "src/domains/dashboard/dashboard.api.test.ts",
  "src/domains/plan/plan.api.test.ts",
  "src/domains/plan/plan.recovery.signal.test.ts",
  "src/domains/plan/plan.recovery.test.ts",
  "src/domains/platform/notifications/NotificationCenter.test.tsx",
  "src/domains/platform/notifications/notifications.api.test.ts",
  "src/domains/platform/notifications/notifications.recovery.test.ts",
  "src/domains/platform/notifications/notifications.schema.test.ts",
  "src/domains/platform/preferences/preferences.drafts.test.ts",
  "src/domains/platform/preferences/preferences.mutations.test.tsx",
  "src/domains/platform/preferences/preferences.store.test.tsx",
  "src/domains/platform/search/CommandPalette.test.tsx",
  "src/domains/platform/search/search.registry.test.ts",
  "src/domains/platform/todo/TodoDock.test.tsx",
  "src/domains/platform/todo/todo.mutations.test.ts",
  "src/domains/platform/todo/todoDrafts.test.ts",
  "src/domains/problems/problems.api.test.ts",
  "src/domains/problems/problems.events.test.ts",
  "src/domains/problems/problems.recovery.test.ts",
  "src/domains/problems/problems.routes.test.ts",
  "src/domains/training/training.api.test.ts",
  "src/domains/training/training.mutations.signal.test.ts",
  "src/domains/training/training.recovery.test.ts",
  "src/legacy-preview/LegacyRouteAdapter.test.tsx",
  "src/legacy-preview/unmigratedRoutes.test.ts",
  "src/pages/plan/PlanPage.test.tsx",
  "src/pages/plan/TaskEditor.test.tsx",
  "src/pages/plan/plan.components.test.tsx",
  "src/pages/plan/plan.model.test.ts",
  "src/pages/plan/usePlanMutationWorkflow.test.tsx",
  "src/pages/training/OverviewPage.test.tsx",
  "src/pages/training/ProblemTrainingHandoffPage.test.tsx",
  "src/pages/training/ProblemsPage.test.tsx",
  "src/pages/training/overview.model.test.ts",
  "src/pages/training/planDiagnosticCatalog.test.ts",
  "src/pages/training/problems/ProblemsWorkspace.test.tsx",
  "src/pages/training/problems/problemsPage.model.test.ts",
  "src/pages/training/problems/useProblemMutationWorkflow.test.tsx",
  "src/pages/training/problems/useProblemTrainingWorkflow.test.tsx",
  "src/pages/v2/AuthPage.test.tsx",
  "src/shared/api/client.test.ts",
  "src/shared/api/mutationRecovery.test.ts",
  "src/shared/api/ownerScopedQueries.test.ts",
  "src/shared/i18n/I18nProvider.test.tsx",
  "src/shared/lib/accountScope.test.ts",
  "src/shared/lib/ownerScopedBrowserNotification.test.ts",
  "src/shared/lib/useGlobalShortcut.test.tsx",
  "src/shared/lib/useOnlineStatus.test.tsx",
  "src/shared/storage/draftOwnerBoundary.test.ts",
  "src/shared/storage/drafts.indexeddb.test.ts",
  "src/shared/storage/drafts.test.ts",
  "tests/frontend-v2-edge-proxy.test.mjs",
]);

export const STRICT_API_PYTEST_TEST_FILES = Object.freeze([
  "api/tests/auth/test_challenge_limits.py",
  "api/tests/auth/test_google.py",
  "api/tests/auth/test_google_store.py",
  "api/tests/auth/test_passwords_csrf.py",
  "api/tests/auth/test_postgres_integration.py",
  "api/tests/auth/test_router.py",
  "api/tests/auth/test_service.py",
  "api/tests/dashboard/test_router.py",
  "api/tests/notifications/test_router.py",
  "api/tests/plans/test_postgres_integration.py",
  "api/tests/plans/test_router.py",
  "api/tests/plans/test_service.py",
  "api/tests/preferences/test_router.py",
  "api/tests/problems/test_postgres_integration.py",
  "api/tests/problems/test_router.py",
  "api/tests/test_config.py",
  "api/tests/test_database.py",
  "api/tests/test_dependency_lock.py",
  "api/tests/test_http_kernel.py",
  "api/tests/test_idempotency_records.py",
  "api/tests/test_media_storage.py",
  "api/tests/test_migrations.py",
  "api/tests/test_phase2_domain_models.py",
  "api/tests/test_phase2_schema_contract.py",
  "api/tests/training/test_append_only_boundary.py",
  "api/tests/training/test_postgres_integration.py",
  "api/tests/training/test_router.py",
  "api/tests/training/test_schemas.py",
  "api/tests/users/test_router.py",
]);

export const STRICT_PHASE1_UNITTEST_TEST_FILES = Object.freeze([
  "tests/test_frontend_upgrade_phase1_postgres.py",
]);

export const STRICT_PHASE1_UNITTEST_TEST_IDS = Object.freeze([
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_cleanup_confirmation_and_scope_fail_closed",
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_connection_and_query_exceptions_are_sanitized",
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_exact_python_patch_is_required_before_any_external_action",
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_explicit_cleanup_removes_anonymous_one_time_audit_challenges",
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_explicit_cleanup_removes_only_synthetic_audit_users",
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_google_oauth_cleanup_requires_the_first_callback_to_have_consumed_state",
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_invalid_dsn_and_digest_fail_before_connect",
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_main_accepts_cleanup_targets_only_over_bounded_stdin",
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_main_emits_one_json_document_and_rejects_secret_arguments",
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_major_role_head_schema_and_cleanup_are_strict",
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_mid_cleanup_failure_rolls_back_without_commit",
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_migration_probe_requires_exact_pinned_deterministic_pg18_result",
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_provider_evidence_must_be_current_isolated_and_pg18",
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_success_checks_pg18_head_schema_round_trip_and_empty_data",
  "test_frontend_upgrade_phase1_postgres.Phase1PostgresCheckTests.test_unrelated_anonymous_challenge_is_never_deleted",
]);

export const STRICT_PLAYWRIGHT_TEST_COUNTS = Object.freeze({
  full: 157,
  visual: 9,
  nonvisual: 148,
  phase2: 75,
  nonphase2: 82,
  performance: 1,
});

export const STRICT_PHASE1_NODE_TEST_FILES = Object.freeze([
  "tests/frontend-upgrade-phase1-auth.test.mjs",
  "tests/frontend-upgrade-phase1-contracts.test.mjs",
  "tests/frontend-upgrade-phase1-google-oauth-provision.test.mjs",
  "tests/frontend-upgrade-phase1-legacy-boundary.test.mjs",
  "tests/frontend-upgrade-phase1-preview-live.test.mjs",
  "tests/frontend-upgrade-phase1-provider-evidence.test.mjs",
  "tests/frontend-upgrade-phase1-r2.test.mjs",
  "tests/frontend-upgrade-phase1-system-surfaces.test.mjs",
  "tests/frontend-upgrade-phase1.test.mjs",
]);

export const STRICT_PHASE2_NODE_TEST_FILES = Object.freeze([
  "tests/frontend-upgrade-phase2-aggregate.test.mjs",
  "tests/frontend-upgrade-phase2-ci-contract.test.mjs",
  "tests/frontend-upgrade-phase2-contract-evidence.test.mjs",
  "tests/frontend-upgrade-phase2-contracts.test.mjs",
  "tests/frontend-upgrade-phase2-dependency-lock.test.mjs",
  "tests/frontend-upgrade-phase2-evidence-lock.test.mjs",
  "tests/frontend-upgrade-phase2-evidence-provenance.test.mjs",
  "tests/frontend-upgrade-phase2-manifest-contract.test.mjs",
  "tests/frontend-upgrade-phase2-operator-runner.test.mjs",
  "tests/frontend-upgrade-phase2-performance-evidence.test.mjs",
  "tests/frontend-upgrade-phase2-playwright-evidence.test.mjs",
  "tests/frontend-upgrade-phase2-provider-evidence.test.mjs",
  "tests/frontend-upgrade-phase2-review.test.mjs",
  "tests/frontend-upgrade-phase2-schema-contract.test.mjs",
  "tests/frontend-upgrade-phase2-visual-evidence.test.mjs",
]);

export const STRICT_DESIGN_SYSTEM_NODE_TEST_FILES = Object.freeze([
  "tests/design-system-v2-contracts.test.mjs",
]);

export const STRICT_BUILD_ISOLATION_NODE_TEST_FILES = Object.freeze([
  "tests/frontend-v2-build-isolation.test.mjs",
]);

export const sha256StringInventory = (inventory) => {
  if (
    !Array.isArray(inventory)
    || inventory.length === 0
    || inventory.some((entry) => typeof entry !== "string" || entry.length === 0)
    || new Set(inventory).size !== inventory.length
  ) throw new Error("strict string inventory is invalid");
  return createHash("sha256").update([...inventory].sort().join("\n")).digest("hex");
};

export const STRICT_VITEST_V2_FILE_INVENTORY_SHA256 = (
  "b8121773900e10e5ed6ccdc694ac846b21502382c0186b3a070c0b8cc692f2b9"
);
export const STRICT_API_PYTEST_FILE_INVENTORY_SHA256 = (
  "3c6ee8c2ade8e0e0c3077135148fb9569041705b15000c2a91186d185265c971"
);
export const STRICT_PHASE1_UNITTEST_FILE_INVENTORY_SHA256 = (
  "14a2663bc33902fb9c0b6dac7fc3e35d9cdeebd25ea67b55b8bf15c2821235a7"
);
export const STRICT_PHASE1_UNITTEST_TEST_ID_INVENTORY_SHA256 = (
  "37441852a188961e61bb170490fa4f377c5bdd8d3208acf5f2b1b02308142ded"
);
export const STRICT_PHASE1_NODE_FILE_INVENTORY_SHA256 = (
  "e67e3837efb20b4b178747030b4a4333ce736527db6ea3ff8098b17597c52bbe"
);
export const STRICT_PHASE2_NODE_FILE_INVENTORY_SHA256 = (
  "410a7cb422a24ab56e3fbc1a852a6572dbca902ae0f5996bedb18799ef80a7ba"
);
export const STRICT_DESIGN_SYSTEM_NODE_FILE_INVENTORY_SHA256 = (
  "fd8b690d38d44a2988aa382b856fa76431750ff260d82dcd449f3f7df87e12fc"
);
export const STRICT_BUILD_ISOLATION_NODE_FILE_INVENTORY_SHA256 = (
  "7a68d833fa35149e81d54e4f1196e20db46b35dbad09288a3000708ab7f8bae4"
);

export const assertExactStringInventory = ({ actual, expected, label }) => {
  if (
    !Array.isArray(actual)
    || !Array.isArray(expected)
    || actual.length !== expected.length
    || actual.some((value, index) => value !== expected[index])
  ) throw new Error(`${label} inventory changed`);
  return true;
};
