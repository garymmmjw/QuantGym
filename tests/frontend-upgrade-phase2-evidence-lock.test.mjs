import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  ACCEPTED_PHASE1_ACCEPTANCE_COMMIT,
  ACCEPTED_PHASE1_APPLICATION_COMMIT,
  ACCEPTED_PHASE1_EVIDENCE_COMMIT,
  ACCEPTED_PHASE1_HANDOFF_COMMIT,
  PHASE1_EVIDENCE_PATHS,
  buildPhase1EvidenceLock,
  validatePhase1EvidenceLock,
  verifyPhase1EvidenceLock,
} from "../scripts/lib/frontend-upgrade-phase2-evidence-lock.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const git = (cwd, args) => execFileSync("/usr/bin/git", args, {
  cwd,
  encoding: "utf8",
  env: {
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_NO_REPLACE_OBJECTS: "1",
  },
}).trim();

const writeFixtureFile = (cwd, relativePath, value) => {
  const filePath = path.join(cwd, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, value);
};

const createFixture = () => {
  const cwd = mkdtempSync(path.join(tmpdir(), "quantgym-phase1-lock-"));
  git(cwd, ["init", "-q"]);
  git(cwd, ["config", "user.name", "QuantGym test"]);
  git(cwd, ["config", "user.email", "quantgym-test@example.com"]);
  for (const evidencePath of PHASE1_EVIDENCE_PATHS) {
    writeFixtureFile(cwd, evidencePath, `accepted object for ${evidencePath}\n`);
  }
  git(cwd, ["add", "--", "docs"]);
  git(cwd, ["commit", "-q", "-m", "application"]);
  const acceptedApplicationCommit = git(cwd, ["rev-parse", "HEAD"]);
  git(cwd, ["commit", "-q", "--allow-empty", "-m", "evidence"]);
  const acceptedEvidenceCommit = git(cwd, ["rev-parse", "HEAD"]);
  git(cwd, ["commit", "-q", "--allow-empty", "-m", "handoff"]);
  const acceptedHandoffCommit = git(cwd, ["rev-parse", "HEAD"]);
  git(cwd, ["commit", "-q", "--allow-empty", "-m", "acceptance"]);
  const acceptedAcceptanceCommit = git(cwd, ["rev-parse", "HEAD"]);
  return {
    cwd,
    commits: {
      acceptedApplicationCommit,
      acceptedEvidenceCommit,
      acceptedHandoffCommit,
      acceptedAcceptanceCommit,
    },
  };
};

test("builds and verifies the accepted 62-file Phase 1 lock from Git objects", async () => {
  const lock = await buildPhase1EvidenceLock({ root });
  assert.deepEqual(validatePhase1EvidenceLock(lock), []);
  assert.deepEqual(await verifyPhase1EvidenceLock({ root, lock }), []);
  assert.equal(lock.generatedFrom, "tracked-git-objects");
  assert.equal(lock.acceptedApplicationCommit, ACCEPTED_PHASE1_APPLICATION_COMMIT);
  assert.equal(lock.acceptedEvidenceCommit, ACCEPTED_PHASE1_EVIDENCE_COMMIT);
  assert.equal(lock.acceptedHandoffCommit, ACCEPTED_PHASE1_HANDOFF_COMMIT);
  assert.equal(lock.acceptedAcceptanceCommit, ACCEPTED_PHASE1_ACCEPTANCE_COMMIT);
  assert.equal(lock.summaryCount, 7);
  assert.equal(lock.reviewImageCount, 48);
  assert.equal(lock.contractCount, 4);
  assert.equal(lock.entryCount, 62);
  assert.deepEqual(lock.entries.map(({ path: entryPath }) => entryPath), PHASE1_EVIDENCE_PATHS);
  assert.equal(lock.entries.some(({ path: entryPath }) => /\/(?:370|390)-/u.test(entryPath)), false);
});

test("the focused CLI prints the canonical tracked-object lock and rejects output overrides", () => {
  const script = path.join(root, "scripts/build-frontend-upgrade-phase1-evidence-lock.mjs");
  const printed = spawnSync(process.execPath, [script, "--root", root, "--stdout"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(printed.status, 0, printed.stderr);
  const lock = JSON.parse(printed.stdout);
  assert.equal(lock.entryCount, 62);
  assert.equal(lock.entries.length, 62);

  const override = spawnSync(process.execPath, [script, "--output", "elsewhere.json"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.notEqual(override.status, 0);
  assert.match(override.stderr, /--output is not supported/u);
});

test("validation rejects 370 and 390 namespace injection", async () => {
  const lock = await buildPhase1EvidenceLock({ root });
  for (const prefix of ["370", "390"]) {
    const injected = structuredClone(lock);
    injected.entries[0].path = (
      `docs/browser-audit-screenshots/${prefix}-frontend-upgrade-injected-summary.json`
    );
    const failures = validatePhase1EvidenceLock(injected);
    assert.ok(
      failures.some((failure) => failure.includes("forbidden 370/390 evidence path")),
      failures.join("\n"),
    );
  }
});

test("builder locks the exact ancestry and rejects protected worktree pollution", async (t) => {
  const fixture = createFixture();
  t.after(() => rmSync(fixture.cwd, { recursive: true, force: true }));

  const initial = await buildPhase1EvidenceLock({ root: fixture.cwd, ...fixture.commits });
  assert.equal(initial.entryCount, 62);
  assert.deepEqual(
    validatePhase1EvidenceLock(initial, fixture.commits),
    [],
  );
  assert.deepEqual(await verifyPhase1EvidenceLock({
    root: fixture.cwd,
    lock: initial,
    expectedCommitOverrides: fixture.commits,
  }), []);

  writeFixtureFile(
    fixture.cwd,
    "docs/browser-audit-screenshots/370-user-owned-sentinel.json",
    "outside Phase 1 lock\n",
  );
  assert.deepEqual(
    await buildPhase1EvidenceLock({ root: fixture.cwd, ...fixture.commits }),
    initial,
  );

  const protectedPath = PHASE1_EVIDENCE_PATHS[0];
  const protectedAbsolutePath = path.join(fixture.cwd, protectedPath);
  const original = readFileSync(protectedAbsolutePath, "utf8");
  writeFileSync(protectedAbsolutePath, "unstaged poison\n");
  await assert.rejects(
    buildPhase1EvidenceLock({ root: fixture.cwd, ...fixture.commits }),
    /working tree is polluted/u,
  );
  writeFileSync(protectedAbsolutePath, original);

  writeFileSync(protectedAbsolutePath, "staged poison\n");
  git(fixture.cwd, ["add", "--", protectedPath]);
  await assert.rejects(
    buildPhase1EvidenceLock({ root: fixture.cwd, ...fixture.commits }),
    /working tree is polluted/u,
  );
  writeFileSync(protectedAbsolutePath, original);
  git(fixture.cwd, ["add", "--", protectedPath]);

  writeFixtureFile(
    fixture.cwd,
    "docs/browser-audit-screenshots/380-untracked-injection.json",
    "forbidden Phase 1 addition\n",
  );
  await assert.rejects(
    buildPhase1EvidenceLock({ root: fixture.cwd, ...fixture.commits }),
    /working tree is polluted/u,
  );
  rmSync(path.join(
    fixture.cwd,
    "docs/browser-audit-screenshots/380-untracked-injection.json",
  ));

  await assert.rejects(buildPhase1EvidenceLock({
    root: fixture.cwd,
    ...fixture.commits,
    acceptedEvidenceCommit: fixture.commits.acceptedHandoffCommit,
    acceptedHandoffCommit: fixture.commits.acceptedEvidenceCommit,
  }), /evidence commit is not an ancestor of handoff/u);
});

test("verification detects a clean committed mutation after acceptance", async (t) => {
  const fixture = createFixture();
  t.after(() => rmSync(fixture.cwd, { recursive: true, force: true }));
  const lock = await buildPhase1EvidenceLock({ root: fixture.cwd, ...fixture.commits });
  const protectedPath = PHASE1_EVIDENCE_PATHS.at(-1);
  writeFileSync(path.join(fixture.cwd, protectedPath), "committed poison\n");
  git(fixture.cwd, ["add", "--", protectedPath]);
  git(fixture.cwd, ["commit", "-q", "-m", "tamper locked evidence"]);

  const failures = await verifyPhase1EvidenceLock({
    root: fixture.cwd,
    lock,
    expectedCommitOverrides: fixture.commits,
  });
  assert.ok(
    failures.some((failure) => failure.includes("tracked bytes mismatch")),
    failures.join("\n"),
  );
});
