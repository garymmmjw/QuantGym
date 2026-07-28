import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PHASE2_PROVIDER_EVIDENCE_BLOCK_END,
  PHASE2_PROVIDER_EVIDENCE_BLOCK_START,
  PHASE2_REVIEW_DOCUMENT_PATH,
  PHASE2_USER_UNTRACKED_ALLOWLIST,
  assertPhase2EvidenceCommit,
  capturePhase2EvidenceProvenance,
  classifyPhase2EvidenceLifecycle,
  renderPhase2EmbeddedProviderEvidence,
  runPhase2EvidenceBuilderWithProvenance,
  runPhase2EvidenceInPlaceWithProvenance,
} from "../scripts/lib/frontend-upgrade-phase2-evidence-provenance.mjs";
import {
  runPhase2PreviewCutover,
} from "../scripts/lib/frontend-upgrade-phase2-cutover-orchestrator.mjs";
import {
  createPhase2CutoverDryRunFixture,
  createPhase2CutoverFixtureClock,
  createPhase2CutoverFixtureCredentialRoles,
} from "../scripts/lib/frontend-upgrade-phase2-cutover-fixture.mjs";
import {
  PHASE2_RECOVERY_JOURNAL_TRUST_BOUNDARY,
} from "../scripts/lib/frontend-upgrade-phase2-provider-evidence.mjs";
import {
  writeFileAtomicallyWithinTrustedRoot,
} from "../scripts/lib/frontend-upgrade-phase1-contracts.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureTemporaryRoot = await realpath(tmpdir());
const manifestFixture = JSON.parse(await readFile(
  path.join(repositoryRoot, "docs/frontend-upgrade/phase-2-acceptance-manifest.json"),
  "utf8",
));
const contractOutput = (
  "docs/browser-audit-screenshots/"
  + "390-frontend-upgrade-phase-2-contract-summary.json"
);
const aggregateOutput = (
  "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-summary.json"
);
const componentOutputs = Object.freeze({
  contract: contractOutput,
  visual: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-visual-summary.json"
  ),
  accessibility: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-accessibility-summary.json"
  ),
  journeys: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-journeys-summary.json"
  ),
  recovery: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-recovery-summary.json"
  ),
  performance: (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-performance-summary.json"
  ),
});
const componentChecks = Object.freeze({
  contract: "frontend-upgrade-phase2-contracts",
  visual: "frontend-upgrade-phase2-visual",
  accessibility: "frontend-upgrade-phase2-accessibility",
  journeys: "frontend-upgrade-phase2-journeys",
  recovery: "frontend-upgrade-phase2-recovery",
  performance: "frontend-upgrade-phase2-performance",
});
const hash = (value) => createHash("sha256").update(value).digest("hex");
const REVIEW_GENERATED_AT = "2026-07-27T02:00:00.000Z";
const PROVIDER_EXPIRES_AT = "2026-08-03T02:00:00.000Z";

const providerEvidenceBytesFor = async (fixture) => {
  if (Buffer.isBuffer(fixture.providerEvidenceBytes)) return fixture.providerEvidenceBytes;
  const evidence = {
    schemaVersion: 1,
    phase: 2,
    status: "pass",
    capturedAt: REVIEW_GENERATED_AT,
    expiresAt: PROVIDER_EXPIRES_AT,
    environment: "preview",
    branch: "codex/frontend-v2-preview",
    applicationCommit: fixture.applicationCommit,
    governance: {
      operator: "Gary",
      budgetOwner: "Gary",
      dataResetOwner: "Gary",
      destroyOwner: "Gary",
      reviewDate: "2026-07-29",
    },
    capture: {
      authenticated: true,
      inputSource: "operator-environment",
      rawResponsesPersisted: false,
      journalTrustBoundary: structuredClone(
        PHASE2_RECOVERY_JOURNAL_TRUST_BOUNDARY,
      ),
    },
    ...await runPhase2PreviewCutover({
      mode: "dry-run",
      expectedCommit: fixture.applicationCommit,
      actions: createPhase2CutoverDryRunFixture({
        expectedCommit: fixture.applicationCommit,
      }),
      credentialRoles: createPhase2CutoverFixtureCredentialRoles(),
      clock: createPhase2CutoverFixtureClock(),
    }),
  };
  fixture.providerEvidenceBytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`);
  return fixture.providerEvidenceBytes;
};

const gitEnvironment = {
  PATH: "/usr/bin:/bin",
  LANG: "C",
  LC_ALL: "C",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_NO_REPLACE_OBJECTS: "1",
};

const git = (root, args) => execFileSync("/usr/bin/git", args, {
  cwd: root,
  encoding: "utf8",
  env: gitEnvironment,
}).trim();

const writeFixtureFile = async (root, relativePath, contents) => {
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, contents);
};

const createFixture = async (t) => {
  const root = await mkdtemp(path.join(
    fixtureTemporaryRoot,
    "quantgym-phase2-provenance-test-",
  ));
  t.after(() => rm(root, { force: true, recursive: true }));
  git(root, ["init", "-q"]);
  git(root, ["config", "user.name", "Phase 2 Evidence Test"]);
  git(root, ["config", "user.email", "phase2-evidence@example.invalid"]);
  await writeFixtureFile(root, ".gitignore", "artifacts/\n");
  await writeFixtureFile(root, "app.txt", "frozen application\n");
  await writeFixtureFile(
    root,
    "docs/browser-audit-screenshots/.gitkeep",
    "",
  );
  await writeFixtureFile(
    root,
    "docs/frontend-upgrade/phase-2-acceptance-manifest.json",
    `${JSON.stringify({
      schemaVersion: 1,
      phase: 2,
      evidenceOutputs: manifestFixture.evidenceOutputs,
    }, null, 2)}\n`,
  );
  await writeFixtureFile(
    root,
    "docs/frontend-upgrade/phase-1-evidence-lock.json",
    "{\"fixture\":\"phase-1-lock\"}\n",
  );
  await writeFixtureFile(
    root,
    "docs/frontend-upgrade/phase-2-preview-contract.json",
    `${JSON.stringify({
      commits: {
        candidateApplicationCommitSource: "provider-evidence.applicationCommit",
        candidateApiCommitSource: "provider-evidence.deployments.api.commit",
        candidatePagesCommitSource: "provider-evidence.deployments.pages.commit",
        candidateCommitsMustMatch: true,
      },
      evidence: {
        providerEvidencePath: (
          "artifacts/frontend-upgrade/phase-2-preview/provider-evidence.redacted.json"
        ),
      },
    }, null, 2)}\n`,
  );
  git(root, ["add", "."]);
  git(root, ["commit", "-q", "-m", "frozen application"]);
  const manifestBytes = await readFile(
    path.join(root, "docs/frontend-upgrade/phase-2-acceptance-manifest.json"),
  );
  const phase1LockBytes = await readFile(
    path.join(root, "docs/frontend-upgrade/phase-1-evidence-lock.json"),
  );
  return {
    applicationCommit: git(root, ["rev-parse", "HEAD"]),
    manifestSha256: hash(manifestBytes),
    phase1EvidenceLockSha256: hash(phase1LockBytes),
    root,
  };
};

const trackedSummary = ({ fixture, component, commit = fixture.applicationCommit }) => ({
  schemaVersion: 1,
  check: componentChecks[component],
  status: "pass",
  checkedAt: "2026-07-27T01:55:00.000Z",
  commit,
  manifestSha256: fixture.manifestSha256,
  phase1EvidenceLockSha256: fixture.phase1EvidenceLockSha256,
  results: [],
  visualCases: [],
  checks: {},
  counts: {},
  metrics: {},
  failureCodes: [],
});

const writeTrackedSummaries = async ({
  fixture,
  components = Object.keys(componentOutputs),
  commitFor = () => fixture.applicationCommit,
}) => {
  for (const component of components) {
    await writeFixtureFile(
      fixture.root,
      componentOutputs[component],
      `${JSON.stringify(trackedSummary({
        fixture,
        component,
        commit: commitFor(component),
      }), null, 2)}\n`,
    );
  }
};

const componentForOutput = new Map(
  Object.entries(componentOutputs).map(([component, relativePath]) => [relativePath, component]),
);

const writeLifecycleOutputs = async ({
  fixture,
  outputs = manifestFixture.evidenceOutputs,
  aggregateCheckedAt = REVIEW_GENERATED_AT,
} = {}) => {
  for (const relativePath of outputs) {
    const component = componentForOutput.get(relativePath);
    await writeFixtureFile(
      fixture.root,
      relativePath,
      component
        ? `${JSON.stringify(trackedSummary({ fixture, component }), null, 2)}\n`
        : relativePath === aggregateOutput
          ? `${JSON.stringify({ checkedAt: aggregateCheckedAt }, null, 2)}\n`
        : `fixture evidence for ${relativePath}\n`,
    );
  }
};

const commitLifecycleOutputs = async ({
  fixture,
  outputs = manifestFixture.evidenceOutputs,
  aggregateCheckedAt = REVIEW_GENERATED_AT,
  message = "complete Phase 2 evidence",
} = {}) => {
  await writeLifecycleOutputs({ fixture, outputs, aggregateCheckedAt });
  git(fixture.root, ["add", ...outputs]);
  git(fixture.root, ["commit", "-q", "-m", message]);
  return git(fixture.root, ["rev-parse", "HEAD"]);
};

const reviewHandoffDocument = async ({
  fixture,
  evidenceCommit,
  generatedAt = REVIEW_GENERATED_AT,
  status = "ready-for-review",
  note = "Initial provider-backed review handoff.",
} = {}) => {
  const aggregateBytes = await readFile(path.join(fixture.root, aggregateOutput));
  const providerEvidenceBytes = await providerEvidenceBytesFor(fixture);
  const visualReceiptPath = manifestFixture.evidenceOutputs.find((relativePath) => (
    relativePath.endsWith("390-frontend-upgrade-phase-2-visual-review-receipt.json")
  ));
  const visualReceiptBytes = await readFile(path.join(fixture.root, visualReceiptPath));
  return `# QuantGym Frontend Platform Upgrade Phase 2 Review

Date: ${generatedAt.slice(0, 10)}
Status: ${status}
${status === "ready-for-review"
    ? "Acceptance: pending Gary's explicit confirmation"
    : "Acceptance: Gary explicitly accepted Phase 2"}

<!-- quantgym-phase2-review:v1 application=${fixture.applicationCommit} evidence=${evidenceCommit} visualReceipt=${hash(visualReceiptBytes)} provider=${hash(providerEvidenceBytes)} aggregate=${hash(aggregateBytes)} generated=${generatedAt} status=${status} -->

${renderPhase2EmbeddedProviderEvidence(providerEvidenceBytes)}

${note}
`;
};

const embeddedProviderBlock = (document) => {
  const start = document.indexOf(PHASE2_PROVIDER_EVIDENCE_BLOCK_START);
  const endMarker = document.indexOf(PHASE2_PROVIDER_EVIDENCE_BLOCK_END, start);
  assert.ok(start >= 0 && endMarker > start);
  return document.slice(
    start,
    endMarker + PHASE2_PROVIDER_EVIDENCE_BLOCK_END.length,
  );
};

const replaceEmbeddedProviderBlock = (document, encoded) => document.replace(
  embeddedProviderBlock(document),
  [
    PHASE2_PROVIDER_EVIDENCE_BLOCK_START,
    encoded,
    PHASE2_PROVIDER_EVIDENCE_BLOCK_END,
  ].join("\n"),
);

const bindEmbeddedProviderBytes = (document, bytes) => replaceEmbeddedProviderBlock(
  document,
  bytes.toString("base64"),
).replace(
  /provider=[0-9a-f]{64}/u,
  `provider=${hash(bytes)}`,
);

const commitReviewHandoff = async ({
  fixture,
  evidenceCommit,
  generatedAt = REVIEW_GENERATED_AT,
  status = "ready-for-review",
  note,
  message = "add Phase 2 review handoff",
} = {}) => {
  await writeFixtureFile(
    fixture.root,
    PHASE2_REVIEW_DOCUMENT_PATH,
    await reviewHandoffDocument({
      fixture,
      evidenceCommit,
      generatedAt,
      status,
      note,
    }),
  );
  git(fixture.root, ["add", PHASE2_REVIEW_DOCUMENT_PATH]);
  git(fixture.root, ["commit", "-q", "-m", message]);
  return git(fixture.root, ["rev-parse", "HEAD"]);
};

test("classifies the zero-evidence application commit as candidate", async (t) => {
  const fixture = await createFixture(t);
  assert.deepEqual(await classifyPhase2EvidenceLifecycle({ root: fixture.root }), {
    schemaVersion: 1,
    state: "candidate",
    applicationCommit: fixture.applicationCommit,
    evidenceCommit: null,
    headCommit: fixture.applicationCommit,
    reviewCommit: null,
    evidenceOutputCount: 0,
    evidenceOutputTarget: 30,
  });
});

test("classifies one direct successor containing exactly 30 outputs as evidence", async (t) => {
  const fixture = await createFixture(t);
  const evidenceCommit = await commitLifecycleOutputs({ fixture });
  assert.deepEqual(await classifyPhase2EvidenceLifecycle({ root: fixture.root }), {
    schemaVersion: 1,
    state: "evidence",
    applicationCommit: fixture.applicationCommit,
    evidenceCommit,
    headCommit: evidenceCommit,
    reviewCommit: null,
    evidenceOutputCount: 30,
    evidenceOutputTarget: 30,
  });
});

test("keeps A to E to provider-backed R classified as evidence", async (t) => {
  const fixture = await createFixture(t);
  const evidenceCommit = await commitLifecycleOutputs({ fixture });
  const reviewCommit = await commitReviewHandoff({ fixture, evidenceCommit });
  assert.deepEqual(await classifyPhase2EvidenceLifecycle({ root: fixture.root }), {
    schemaVersion: 1,
    state: "evidence",
    applicationCommit: fixture.applicationCommit,
    evidenceCommit,
    headCommit: reviewCommit,
    reviewCommit,
    evidenceOutputCount: 30,
    evidenceOutputTarget: 30,
  });
  const provenance = await capturePhase2EvidenceProvenance({ root: fixture.root });
  assert.equal(provenance.applicationCommit, fixture.applicationCommit);
  assert.equal(provenance.head, reviewCommit);
  assert.deepEqual(provenance.statusEntries, []);
});

test("accepts the exact five-minute provider and aggregate handoff boundary", async (t) => {
  const fixture = await createFixture(t);
  const evidenceCommit = await commitLifecycleOutputs({
    fixture,
    aggregateCheckedAt: REVIEW_GENERATED_AT,
  });
  const generatedAt = "2026-07-27T02:05:00.000Z";
  const reviewCommit = await commitReviewHandoff({
    fixture,
    evidenceCommit,
    generatedAt,
  });
  const lifecycle = await classifyPhase2EvidenceLifecycle({ root: fixture.root });
  assert.equal(lifecycle.evidenceCommit, evidenceCommit);
  assert.equal(lifecycle.reviewCommit, reviewCommit);
});

test("rejects both first-R five-minute handoff expiry classes", async (t) => {
  for (const [name, aggregateCheckedAt, generatedAt] of [
    [
      "provider capture",
      "2026-07-27T02:05:00.001Z",
      "2026-07-27T02:05:00.001Z",
    ],
    [
      "tracked aggregate",
      "2026-07-27T01:59:59.999Z",
      "2026-07-27T02:05:00.000Z",
    ],
  ]) {
    await t.test(name, async (subtest) => {
      const fixture = await createFixture(subtest);
      const evidenceCommit = await commitLifecycleOutputs({
        fixture,
        aggregateCheckedAt,
      });
      await commitReviewHandoff({ fixture, evidenceCommit, generatedAt });
      await assert.rejects(
        classifyPhase2EvidenceLifecycle({ root: fixture.root }),
        /handoff time is outside the exact five-minute window/u,
      );
    });
  }
});

test("allows later linear updates to the same review document without moving E", async (t) => {
  const fixture = await createFixture(t);
  const evidenceCommit = await commitLifecycleOutputs({ fixture });
  await commitReviewHandoff({ fixture, evidenceCommit });
  const acceptedCommit = await commitReviewHandoff({
    fixture,
    evidenceCommit,
    status: "accepted",
    note: "Gary explicitly accepted Phase 2 after independent review.",
    message: "record explicit Phase 2 acceptance",
  });
  const acceptedUpdateCommit = await commitReviewHandoff({
    fixture,
    evidenceCommit,
    status: "accepted",
    note: "Gary retained acceptance after adding a review-only note.",
    message: "add accepted review note",
  });
  const lifecycle = await classifyPhase2EvidenceLifecycle({ root: fixture.root });
  assert.equal(lifecycle.state, "evidence");
  assert.equal(lifecycle.applicationCommit, fixture.applicationCommit);
  assert.equal(lifecycle.evidenceCommit, evidenceCommit);
  assert.notEqual(acceptedUpdateCommit, acceptedCommit);
  assert.equal(lifecycle.headCommit, acceptedUpdateCommit);
  assert.equal(lifecycle.reviewCommit, acceptedUpdateCommit);
});

test("freezes the first R provider bytes and generated time across accepted successors", async (t) => {
  for (const [name, mutate] of [
    ["provider bytes", async ({ document, fixture }) => {
      const evidence = JSON.parse((await providerEvidenceBytesFor(fixture)).toString("utf8"));
      evidence.expiresAt = "2026-08-02T02:00:00.000Z";
      return bindEmbeddedProviderBytes(
        document,
        Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`),
      );
    }],
    ["generated time", async ({ document }) => document.replace(
      `generated=${REVIEW_GENERATED_AT}`,
      "generated=2026-07-27T02:01:00.000Z",
    )],
  ]) {
    await t.test(name, async (subtest) => {
      const fixture = await createFixture(subtest);
      const evidenceCommit = await commitLifecycleOutputs({ fixture });
      await commitReviewHandoff({ fixture, evidenceCommit });
      const accepted = await reviewHandoffDocument({
        fixture,
        evidenceCommit,
        status: "accepted",
      });
      await writeFixtureFile(
        fixture.root,
        PHASE2_REVIEW_DOCUMENT_PATH,
        await mutate({ document: accepted, fixture }),
      );
      git(fixture.root, ["add", PHASE2_REVIEW_DOCUMENT_PATH]);
      git(fixture.root, ["commit", "-q", "-m", `change accepted ${name}`]);
      await assert.rejects(
        classifyPhase2EvidenceLifecycle({ root: fixture.root }),
        /changed its provider evidence binding/u,
      );
    });
  }
});

test("rejects an accepted review marker without Gary's exact acceptance line", async (t) => {
  const fixture = await createFixture(t);
  const evidenceCommit = await commitLifecycleOutputs({ fixture });
  await commitReviewHandoff({ fixture, evidenceCommit });
  const forged = (await reviewHandoffDocument({
    fixture,
    evidenceCommit,
    status: "accepted",
  })).replace(
    "Acceptance: Gary explicitly accepted Phase 2",
    "Acceptance: pending Gary's explicit confirmation",
  );
  await writeFixtureFile(fixture.root, PHASE2_REVIEW_DOCUMENT_PATH, forged);
  git(fixture.root, ["add", PHASE2_REVIEW_DOCUMENT_PATH]);
  git(fixture.root, ["commit", "-q", "-m", "forge acceptance marker"]);
  await assert.rejects(
    classifyPhase2EvidenceLifecycle({ root: fixture.root }),
    /review handoff document is invalid/u,
  );
});

test("rejects review status regression from accepted back to pending", async (t) => {
  const fixture = await createFixture(t);
  const evidenceCommit = await commitLifecycleOutputs({ fixture });
  await commitReviewHandoff({ fixture, evidenceCommit });
  await commitReviewHandoff({
    fixture,
    evidenceCommit,
    status: "accepted",
    message: "record explicit acceptance",
  });
  await commitReviewHandoff({
    fixture,
    evidenceCommit,
    status: "ready-for-review",
    message: "regress acceptance",
  });
  await assert.rejects(
    classifyPhase2EvidenceLifecycle({ root: fixture.root }),
    /acceptance cannot regress/u,
  );
});

test("rejects every partial evidence inventory from 1 through 29 outputs", async (t) => {
  for (let count = 1; count < manifestFixture.evidenceOutputs.length; count += 1) {
    await t.test(`${count} of 30`, async (subtest) => {
      const fixture = await createFixture(subtest);
      const outputs = manifestFixture.evidenceOutputs.slice(0, count);
      await commitLifecycleOutputs({ fixture, outputs, message: `partial evidence ${count}` });
      await assert.rejects(
        classifyPhase2EvidenceLifecycle({ root: fixture.root }),
        /inventory is partial/u,
      );
    });
  }
});

test("rejects a substitute path even when the namespace still contains 30 files", async (t) => {
  const fixture = await createFixture(t);
  const outputs = manifestFixture.evidenceOutputs.slice(0, -1);
  const substitute = (
    "docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-review/substitute.jpg"
  );
  await writeLifecycleOutputs({ fixture, outputs });
  await writeFixtureFile(fixture.root, substitute, "substitute\n");
  git(fixture.root, ["add", ...outputs, substitute]);
  git(fixture.root, ["commit", "-q", "-m", "substituted evidence"]);
  await assert.rejects(
    classifyPhase2EvidenceLifecycle({ root: fixture.root }),
    /substitute or extra evidence paths/u,
  );
});

test("rejects deletion after evidence and cannot regress back to candidate", async (t) => {
  const fixture = await createFixture(t);
  await commitLifecycleOutputs({ fixture });
  git(fixture.root, ["rm", "-q", ...manifestFixture.evidenceOutputs]);
  git(fixture.root, ["commit", "-q", "-m", "delete all evidence"]);
  await assert.rejects(
    classifyPhase2EvidenceLifecycle({ root: fixture.root }),
    /cannot return to candidate after evidence existed/u,
  );
});

test("rejects an evidence successor after any one of the 30 outputs is deleted", async (t) => {
  const fixture = await createFixture(t);
  await commitLifecycleOutputs({ fixture });
  const deleted = manifestFixture.evidenceOutputs.at(-1);
  git(fixture.root, ["rm", "-q", deleted]);
  git(fixture.root, ["commit", "-q", "-m", "delete one evidence output"]);
  await assert.rejects(
    classifyPhase2EvidenceLifecycle({ root: fixture.root }),
    /inventory is partial/u,
  );
});

test("rejects a multi-commit evidence lifecycle even when HEAD reaches 30 outputs", async (t) => {
  const fixture = await createFixture(t);
  const first = manifestFixture.evidenceOutputs.slice(0, 1);
  await commitLifecycleOutputs({ fixture, outputs: first, message: "partial evidence" });
  const remaining = manifestFixture.evidenceOutputs.slice(1);
  await writeLifecycleOutputs({ fixture, outputs: remaining });
  git(fixture.root, ["add", ...remaining]);
  git(fixture.root, ["commit", "-q", "-m", "complete evidence later"]);
  await assert.rejects(
    classifyPhase2EvidenceLifecycle({ root: fixture.root }),
    /evidence transition must add the exact regular 30 outputs/u,
  );
});

test("rejects deletion of the review document after R", async (t) => {
  const fixture = await createFixture(t);
  const evidenceCommit = await commitLifecycleOutputs({ fixture });
  await commitReviewHandoff({ fixture, evidenceCommit });
  git(fixture.root, ["rm", "-q", PHASE2_REVIEW_DOCUMENT_PATH]);
  git(fixture.root, ["commit", "-q", "-m", "delete review handoff"]);
  await assert.rejects(
    classifyPhase2EvidenceLifecycle({ root: fixture.root }),
    /may only add or modify the review document/u,
  );
});

test("rejects renaming the review document after R", async (t) => {
  const fixture = await createFixture(t);
  const evidenceCommit = await commitLifecycleOutputs({ fixture });
  await commitReviewHandoff({ fixture, evidenceCommit });
  const renamed = "docs/frontend-upgrade/phase-2-review-renamed.md";
  git(fixture.root, ["mv", PHASE2_REVIEW_DOCUMENT_PATH, renamed]);
  git(fixture.root, ["commit", "-q", "-m", "rename review handoff"]);
  await assert.rejects(
    classifyPhase2EvidenceLifecycle({ root: fixture.root }),
    /successor contains application source changes|may only add or modify the review document/u,
  );
});

test("rejects any evidence rewrite or deletion after R", async (t) => {
  for (const [label, mutate] of [
    ["rewrite aggregate", async (fixture) => {
      await writeFixtureFile(fixture.root, aggregateOutput, "rewritten aggregate\n");
      git(fixture.root, ["add", aggregateOutput]);
    }],
    ["delete visual evidence", async (fixture) => {
      git(fixture.root, ["rm", "-q", manifestFixture.evidenceOutputs.at(-1)]);
    }],
  ]) {
    await t.test(label, async (subtest) => {
      const fixture = await createFixture(subtest);
      const evidenceCommit = await commitLifecycleOutputs({ fixture });
      await commitReviewHandoff({ fixture, evidenceCommit });
      await mutate(fixture);
      git(fixture.root, ["commit", "-q", "-m", label]);
      await assert.rejects(
        classifyPhase2EvidenceLifecycle({ root: fixture.root }),
        /inventory is partial|may only add or modify the review document/u,
      );
    });
  }
});

test("rejects any non-review path after E or R", async (t) => {
  const fixture = await createFixture(t);
  const evidenceCommit = await commitLifecycleOutputs({ fixture });
  await commitReviewHandoff({ fixture, evidenceCommit });
  await writeFixtureFile(fixture.root, "unexpected-review-successor.txt", "unexpected\n");
  git(fixture.root, ["add", "unexpected-review-successor.txt"]);
  git(fixture.root, ["commit", "-q", "-m", "unexpected review successor"]);
  await assert.rejects(
    classifyPhase2EvidenceLifecycle({ root: fixture.root }),
    /successor contains application source changes|may only add or modify the review document/u,
  );
});

test("rejects a merge successor even when its tree only adds the review document", async (t) => {
  const fixture = await createFixture(t);
  const applicationBranch = git(fixture.root, ["branch", "--show-current"]);
  const evidenceCommit = await commitLifecycleOutputs({ fixture });
  git(fixture.root, ["switch", "-q", "-c", "review-side"]);
  await commitReviewHandoff({ fixture, evidenceCommit });
  git(fixture.root, ["switch", "-q", applicationBranch]);
  git(fixture.root, ["merge", "--no-ff", "-q", "review-side", "-m", "merge review"]);
  await assert.rejects(
    classifyPhase2EvidenceLifecycle({ root: fixture.root }),
    /merge or non-linear successor/u,
  );
});

test("rejects a formal review document whose evidence hashes are forged", async (t) => {
  const fixture = await createFixture(t);
  const evidenceCommit = await commitLifecycleOutputs({ fixture });
  const forged = (await reviewHandoffDocument({ fixture, evidenceCommit })).replace(
    /aggregate=[0-9a-f]{64}/u,
    `aggregate=${"f".repeat(64)}`,
  );
  await writeFixtureFile(fixture.root, PHASE2_REVIEW_DOCUMENT_PATH, forged);
  git(fixture.root, ["add", PHASE2_REVIEW_DOCUMENT_PATH]);
  git(fixture.root, ["commit", "-q", "-m", "forged review handoff"]);
  await assert.rejects(
    classifyPhase2EvidenceLifecycle({ root: fixture.root }),
    /hashes do not match tracked evidence/u,
  );
});

test("rejects every invalid embedded provider-evidence lifecycle binding", async (t) => {
  const invalidCases = [
    ["arbitrary provider marker hash", ({ document }) => document.replace(
      /provider=[0-9a-f]{64}/u,
      `provider=${"f".repeat(64)}`,
    )],
    ["missing base64 block", ({ document }) => document.replace(
      embeddedProviderBlock(document),
      "",
    )],
    ["duplicate base64 block", ({ document }) => (
      `${document}\n${embeddedProviderBlock(document)}\n`
    )],
    ["invalid base64", ({ document }) => replaceEmbeddedProviderBlock(
      document,
      "AA=A",
    )],
    ["payload hash mismatch", ({ document }) => replaceEmbeddedProviderBlock(
      document,
      Buffer.from("{}\n").toString("base64"),
    )],
    ["invalid JSON with a matching hash", ({ document }) => bindEmbeddedProviderBytes(
      document,
      Buffer.from("not JSON\n"),
    )],
    ["noncanonical JSON bytes", ({ document, providerEvidenceBytes }) => (
      bindEmbeddedProviderBytes(
        document,
        Buffer.from(JSON.stringify(JSON.parse(providerEvidenceBytes.toString("utf8")))),
      )
    )],
    ["duplicate JSON key bytes", ({ document, providerEvidenceBytes }) => (
      bindEmbeddedProviderBytes(
        document,
        Buffer.from(providerEvidenceBytes.toString("utf8").replace(
          '  "status": "pass",',
          '  "status": "fail",\n  "status": "pass",',
        )),
      )
    )],
    ["semantic provider tampering", ({ document, providerEvidenceBytes }) => {
      const evidence = JSON.parse(providerEvidenceBytes.toString("utf8"));
      evidence.status = "fail";
      return bindEmbeddedProviderBytes(
        document,
        Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`),
      );
    }],
    ["wrong provider application commit", ({ document, providerEvidenceBytes }) => {
      const evidence = JSON.parse(providerEvidenceBytes.toString("utf8"));
      evidence.applicationCommit = "f".repeat(40);
      return bindEmbeddedProviderBytes(
        document,
        Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`),
      );
    }],
    ["review generated after provider expiry", ({ document }) => document.replace(
      `generated=${REVIEW_GENERATED_AT}`,
      "generated=2026-08-03T02:00:00.001Z",
    )],
    ["decoded payload exceeds two MiB", ({ document }) => bindEmbeddedProviderBytes(
      document,
      Buffer.alloc(2 * 1024 * 1024 + 1, 0x61),
    )],
  ];
  for (const [name, mutate] of invalidCases) {
    await t.test(name, async (subtest) => {
      const fixture = await createFixture(subtest);
      const evidenceCommit = await commitLifecycleOutputs({ fixture });
      const document = await reviewHandoffDocument({ fixture, evidenceCommit });
      const providerEvidenceBytes = await providerEvidenceBytesFor(fixture);
      await writeFixtureFile(
        fixture.root,
        PHASE2_REVIEW_DOCUMENT_PATH,
        mutate({ document, fixture, providerEvidenceBytes }),
      );
      git(fixture.root, ["add", PHASE2_REVIEW_DOCUMENT_PATH]);
      git(fixture.root, ["commit", "-q", "-m", `invalid provider binding: ${name}`]);
      await assert.rejects(
        classifyPhase2EvidenceLifecycle({ root: fixture.root }),
        /embedded provider evidence|review handoff/u,
      );
    });
  }
});

test("allows only the four exact user-owned untracked files", async (t) => {
  const fixture = await createFixture(t);
  for (const relativePath of PHASE2_USER_UNTRACKED_ALLOWLIST) {
    await writeFixtureFile(fixture.root, relativePath, `user-owned ${relativePath}\n`);
  }
  const provenance = await capturePhase2EvidenceProvenance({ root: fixture.root });
  assert.equal(provenance.applicationCommit, fixture.applicationCommit);
  assert.equal(provenance.statusEntries.length, PHASE2_USER_UNTRACKED_ALLOWLIST.length);
});

test("rejects a dirty tracked application file before evidence generation", async (t) => {
  const fixture = await createFixture(t);
  await writeFixtureFile(fixture.root, "app.txt", "uncommitted implementation\n");
  await assert.rejects(
    capturePhase2EvidenceProvenance({ root: fixture.root }),
    /not clean: tracked: M:app\.txt/u,
  );
});

test("rejects every unexpected untracked path", async (t) => {
  const fixture = await createFixture(t);
  await writeFixtureFile(fixture.root, "unexpected.txt", "pollution\n");
  await assert.rejects(
    capturePhase2EvidenceProvenance({ root: fixture.root }),
    /untracked:unexpected\.txt/u,
  );
});

test("rejects application source drift created while an in-place evidence run is active", async (t) => {
  const fixture = await createFixture(t);
  await assert.rejects(runPhase2EvidenceInPlaceWithProvenance({
    root: fixture.root,
    runner: async () => {
      await writeFixtureFile(fixture.root, "app.txt", "post-run drift\n");
      return { summary: { commit: fixture.applicationCommit } };
    },
  }), /not clean: tracked: M:app\.txt/u);
});

test("installs only the declared output from an isolated detached worktree", async (t) => {
  const fixture = await createFixture(t);
  const result = await runPhase2EvidenceBuilderWithProvenance({
    root: fixture.root,
    component: "contract",
    runner: async ({ applicationCommit, root }) => {
      await writeFileAtomicallyWithinTrustedRoot({
        root,
        relativePath: contractOutput,
        data: "isolated evidence\n",
      });
      return { summary: { commit: applicationCommit } };
    },
  });
  assert.equal(result.summary.commit, fixture.applicationCommit);
  assert.equal(await readFile(path.join(fixture.root, contractOutput), "utf8"), (
    "isolated evidence\n"
  ));
  assert.equal(await readFile(path.join(fixture.root, "app.txt"), "utf8"), (
    "frozen application\n"
  ));
});

test("creates the trusted visual review directory while installing exact manifest outputs", async (t) => {
  const fixture = await createFixture(t);
  const visualOutputs = manifestFixture.evidenceOutputs.filter((relativePath) => (
    relativePath.endsWith("phase-2-visual-summary.json")
    || relativePath.includes("390-frontend-upgrade-phase-2-review/")
  ));
  await runPhase2EvidenceBuilderWithProvenance({
    root: fixture.root,
    component: "visual",
    runner: async ({ applicationCommit, root }) => {
      for (const relativePath of visualOutputs) {
        await writeFixtureFile(root, relativePath, `visual ${relativePath}\n`);
      }
      return { summary: { commit: applicationCommit } };
    },
  });
  assert.equal(
    await readFile(path.join(fixture.root, visualOutputs.at(-1)), "utf8"),
    `visual ${visualOutputs.at(-1)}\n`,
  );
});

test("rejects source-root drift after isolated tests and installs no evidence", async (t) => {
  const fixture = await createFixture(t);
  await assert.rejects(runPhase2EvidenceBuilderWithProvenance({
    root: fixture.root,
    component: "contract",
    runner: async ({ applicationCommit, root, sourceRoot }) => {
      await writeFileAtomicallyWithinTrustedRoot({
        root,
        relativePath: contractOutput,
        data: "must not install\n",
      });
      await writeFixtureFile(sourceRoot, "app.txt", "drifted during isolated run\n");
      return { summary: { commit: applicationCommit } };
    },
  }), /not clean: tracked: M:app\.txt/u);
  await assert.rejects(
    readFile(path.join(fixture.root, contractOutput)),
    /ENOENT/u,
  );
});

test("rejects a wrong isolated summary commit before installing evidence", async (t) => {
  const fixture = await createFixture(t);
  await assert.rejects(runPhase2EvidenceBuilderWithProvenance({
    root: fixture.root,
    component: "contract",
    runner: async ({ root }) => {
      await writeFileAtomicallyWithinTrustedRoot({
        root,
        relativePath: contractOutput,
        data: "wrong commit evidence\n",
      });
      return { summary: { commit: "f".repeat(40) } };
    },
  }), /does not equal the frozen application commit/u);
  await assert.rejects(
    readFile(path.join(fixture.root, contractOutput)),
    /ENOENT/u,
  );
});

test("rejects a component summary for any commit other than the frozen application commit", async (t) => {
  const fixture = await createFixture(t);
  const provenance = await capturePhase2EvidenceProvenance({ root: fixture.root });
  assert.throws(() => assertPhase2EvidenceCommit({
    actualCommit: "f".repeat(40),
    provenance,
  }), /does not equal the frozen application commit/u);
});

test("resolves an evidence-only successor through provider evidence without treating HEAD as app", async (t) => {
  const fixture = await createFixture(t);
  await writeFixtureFile(fixture.root, contractOutput, "committed evidence\n");
  git(fixture.root, ["add", contractOutput]);
  git(fixture.root, ["commit", "-q", "-m", "evidence successor"]);
  const evidenceCommit = git(fixture.root, ["rev-parse", "HEAD"]);
  await writeFixtureFile(
    fixture.root,
    "artifacts/frontend-upgrade/phase-2-preview/provider-evidence.redacted.json",
    `${JSON.stringify({
      applicationCommit: fixture.applicationCommit,
      deployments: {
        api: { commit: fixture.applicationCommit },
        pages: { commit: fixture.applicationCommit },
      },
    })}\n`,
  );
  await chmod(
    path.join(
      fixture.root,
      "artifacts/frontend-upgrade/phase-2-preview/provider-evidence.redacted.json",
    ),
    0o600,
  );
  const provenance = await capturePhase2EvidenceProvenance({ root: fixture.root });
  assert.equal(provenance.head, evidenceCommit);
  assert.equal(provenance.applicationCommit, fixture.applicationCommit);
  assert.notEqual(provenance.applicationCommit, provenance.head);
});

test("rejects an evidence successor that also changes application source", async (t) => {
  const fixture = await createFixture(t);
  await writeFixtureFile(fixture.root, contractOutput, "committed evidence\n");
  await writeFixtureFile(fixture.root, "app.txt", "hidden successor change\n");
  git(fixture.root, ["add", contractOutput, "app.txt"]);
  git(fixture.root, ["commit", "-q", "-m", "mixed successor"]);
  await writeFixtureFile(
    fixture.root,
    "artifacts/frontend-upgrade/phase-2-preview/provider-evidence.redacted.json",
    `${JSON.stringify({
      applicationCommit: fixture.applicationCommit,
      deployments: {
        api: { commit: fixture.applicationCommit },
        pages: { commit: fixture.applicationCommit },
      },
    })}\n`,
  );
  await chmod(
    path.join(
      fixture.root,
      "artifacts/frontend-upgrade/phase-2-preview/provider-evidence.redacted.json",
    ),
    0o600,
  );
  await assert.rejects(
    capturePhase2EvidenceProvenance({ root: fixture.root }),
    /successor contains application source changes/u,
  );
});

test("keeps an explicit aggregate rewrite provenance-stable on an evidence successor", async (t) => {
  const fixture = await createFixture(t);
  await writeTrackedSummaries({ fixture });
  await writeFixtureFile(
    fixture.root,
    PHASE2_REVIEW_DOCUMENT_PATH,
    "tracked review handoff\n",
  );
  git(fixture.root, ["add", ...Object.values(componentOutputs), PHASE2_REVIEW_DOCUMENT_PATH]);
  git(fixture.root, ["commit", "-q", "-m", "tracked evidence-only successor"]);
  const evidenceCommit = git(fixture.root, ["rev-parse", "HEAD"]);

  const provenance = await capturePhase2EvidenceProvenance({ root: fixture.root });
  assert.equal(provenance.applicationCommit, fixture.applicationCommit);
  assert.equal(provenance.head, evidenceCommit);

  const wrapped = await runPhase2EvidenceInPlaceWithProvenance({
    root: fixture.root,
    runner: async ({ applicationCommit }) => {
      await writeFixtureFile(fixture.root, aggregateOutput, "regenerated CI aggregate\n");
      return { summary: { commit: applicationCommit } };
    },
  });
  assert.equal(wrapped.summary.commit, fixture.applicationCommit);
  assert.equal(
    await readFile(path.join(fixture.root, aggregateOutput), "utf8"),
    "regenerated CI aggregate\n",
  );

  await rm(path.join(fixture.root, PHASE2_REVIEW_DOCUMENT_PATH));
  assert.equal(
    (await capturePhase2EvidenceProvenance({ root: fixture.root })).applicationCommit,
    fixture.applicationCommit,
  );
});

test("rejects a no-provider successor with one component summary left untracked", async (t) => {
  const fixture = await createFixture(t);
  const components = Object.keys(componentOutputs);
  await writeTrackedSummaries({ fixture, components: components.slice(0, -1) });
  git(fixture.root, ["add", ...components.slice(0, -1).map((key) => componentOutputs[key])]);
  git(fixture.root, ["commit", "-q", "-m", "incomplete tracked evidence"]);
  await writeTrackedSummaries({ fixture, components: components.slice(-1) });
  await assert.rejects(
    capturePhase2EvidenceProvenance({ root: fixture.root }),
    /missing a component summary/u,
  );
});

test("rejects inconsistent tracked summary commits without provider evidence", async (t) => {
  const fixture = await createFixture(t);
  await writeTrackedSummaries({
    fixture,
    commitFor: (component) => (
      component === "performance" ? "f".repeat(40) : fixture.applicationCommit
    ),
  });
  git(fixture.root, ["add", ...Object.values(componentOutputs)]);
  git(fixture.root, ["commit", "-q", "-m", "inconsistent evidence commits"]);
  await assert.rejects(
    capturePhase2EvidenceProvenance({ root: fixture.root }),
    /summary commits are inconsistent/u,
  );
});

test("rejects a tracked summary commit that is not an ancestor of HEAD", async (t) => {
  const fixture = await createFixture(t);
  const applicationBranch = git(fixture.root, ["branch", "--show-current"]);
  git(fixture.root, ["switch", "-q", "-c", "unrelated-evidence-source"]);
  await writeFixtureFile(fixture.root, "side.txt", "side commit\n");
  git(fixture.root, ["add", "side.txt"]);
  git(fixture.root, ["commit", "-q", "-m", "side commit"]);
  const sideCommit = git(fixture.root, ["rev-parse", "HEAD"]);
  git(fixture.root, ["switch", "-q", applicationBranch]);
  await writeTrackedSummaries({ fixture, commitFor: () => sideCommit });
  git(fixture.root, ["add", ...Object.values(componentOutputs)]);
  git(fixture.root, ["commit", "-q", "-m", "non-ancestor evidence binding"]);
  await assert.rejects(
    capturePhase2EvidenceProvenance({ root: fixture.root }),
    /not an ancestor of HEAD/u,
  );
});

test("rejects a no-provider evidence successor containing application source drift", async (t) => {
  const fixture = await createFixture(t);
  await writeTrackedSummaries({ fixture });
  await writeFixtureFile(fixture.root, "app.txt", "source drift hidden with evidence\n");
  git(fixture.root, ["add", ...Object.values(componentOutputs), "app.txt"]);
  git(fixture.root, ["commit", "-q", "-m", "mixed no-provider successor"]);
  await assert.rejects(
    capturePhase2EvidenceProvenance({ root: fixture.root }),
    /successor contains application source changes/u,
  );
});

test("rejects a tracked component summary symlink without provider evidence", async (t) => {
  const fixture = await createFixture(t);
  const components = Object.keys(componentOutputs);
  await writeTrackedSummaries({ fixture, components: components.slice(0, -1) });
  const linkedOutput = componentOutputs[components.at(-1)];
  await mkdir(path.dirname(path.join(fixture.root, linkedOutput)), { recursive: true });
  await symlink("../../app.txt", path.join(fixture.root, linkedOutput));
  git(fixture.root, ["add", ...Object.values(componentOutputs)]);
  git(fixture.root, ["commit", "-q", "-m", "symlinked evidence summary"]);
  await assert.rejects(
    capturePhase2EvidenceProvenance({ root: fixture.root }),
    /not a regular file/u,
  );
});
