import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  checkDesignSystemV2,
  findStylePolicyViolations,
  V2_STYLE_SCAN_ROOTS,
} from "../scripts/check-design-system-v2.mjs";
import {
  compareStoryIds,
  EXPECTED_STORY_IDS,
  isCompleteStorySet,
  isStoryRenderReady,
} from "../scripts/lib/storybook-a11y-v2.mjs";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

test("the style policy scans native Plan and training pages", () => {
  assert.ok(V2_STYLE_SCAN_ROOTS.includes("src/pages/plan"));
  assert.ok(V2_STYLE_SCAN_ROOTS.includes("src/pages/training"));
});

const semanticHex = (source, token) => {
  const match = source.match(new RegExp(`--${token}:\\s*(#[0-9a-f]{6});`, "iu"));
  assert.ok(match?.[1], `${token} must be a six-digit hex color`);
  return match[1];
};

const relativeLuminance = (hex) => {
  const channels = [1, 3, 5].map((offset) => (
    Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
  ));
  const linear = channels.map((channel) => (
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};

const contrastRatio = (left, right) => {
  const leftLuminance = relativeLuminance(left);
  const rightLuminance = relativeLuminance(right);
  return (
    (Math.max(leftLuminance, rightLuminance) + 0.05)
    / (Math.min(leftLuminance, rightLuminance) + 0.05)
  );
};

test("checked-in V2 tokens exactly implement the approved design contract", async () => {
  assert.deepEqual(await checkDesignSystemV2({ root: projectRoot }), []);
});

test("dialog entry motion is fully disabled for reduced-motion browser audits", async () => {
  const source = await readFile(
    path.join(projectRoot, "src/design-system/primitives/Dialog/Dialog.module.css"),
    "utf8",
  );
  assert.ok(source.includes(
    "@media (prefers-reduced-motion: reduce) {\n"
    + "  .backdrop,\n"
    + "  .panel {\n"
    + "    animation: none;",
  ));
});

test("reward badge tokens retain a 6:1 contrast margin in both themes", async () => {
  for (const theme of ["light", "dark"]) {
    const source = await readFile(
      path.join(projectRoot, `src/design-system/tokens/${theme}.css`),
      "utf8",
    );
    const ratio = contrastRatio(
      semanticHex(source, "qg-reward-ink"),
      semanticHex(source, "qg-reward-surface"),
    );
    assert.ok(ratio >= 6, `${theme} reward contrast is ${ratio.toFixed(2)}:1`);
  }
});

test("danger text tokens retain a 4.5:1 contrast margin in all account-menu states", async () => {
  for (const theme of ["light", "dark"]) {
    const source = await readFile(
      path.join(projectRoot, `src/design-system/tokens/${theme}.css`),
      "utf8",
    );
    for (const backgroundToken of ["qg-surface-primary", "qg-status-danger-soft"]) {
      const ratio = contrastRatio(
        semanticHex(source, "qg-status-danger-text"),
        semanticHex(source, backgroundToken),
      );
      assert.ok(
        ratio >= 4.5,
        `${theme} danger text on ${backgroundToken} is ${ratio.toFixed(2)}:1`,
      );
    }
  }
});

test("account menu binds danger text and hover backgrounds to their semantic tokens", async () => {
  const source = await readFile(
    path.join(
      projectRoot,
      "src/design-system/patterns/AccountMenu/AccountMenu.module.css",
    ),
    "utf8",
  );
  assert.match(
    source,
    /\.signOut\s*\{[^}]*color:\s*var\(--qg-status-danger-text\);[^}]*\}/u,
  );
  assert.match(
    source,
    /\.signOut:hover\s*\{[^}]*background:\s*var\(--qg-status-danger-soft\);[^}]*\}/u,
  );
  assert.doesNotMatch(
    source,
    /\.signOut\s*\{[^}]*color:\s*var\(--qg-status-danger\);[^}]*\}/u,
  );
});

test("component styles consume semantic color, shadow, and layer tokens", () => {
  const source = `
    .button {
      color: var(--qg-text-primary);
      background: linear-gradient(
        180deg,
        var(--qg-action-primary-soft),
        var(--qg-action-primary)
      );
      border-color: currentcolor;
      outline-color: var(--qg-focus-ring);
      box-shadow: var(--qg-shadow-focus-ring);
      filter: var(--qg-shadow-mascot-overlay);
      z-index: var(--qg-layer-dialog);
    }
  `;

  assert.deepEqual(
    findStylePolicyViolations("src/design-system/primitives/Button/button.module.css", source),
    [],
  );
});

test("component styles reject raw colors, shadows, drop shadows, and z-indexes", () => {
  const source = `
    .hex { color: #5b5ff5; }
    .functional { background: rgb(91 95 245 / 50%); }
    .named { border-color: rebeccapurple; }
    .shadow { box-shadow: 0 4px 12px rgb(0 0 0 / 20%); }
    .textShadow { text-shadow: 0 1px currentcolor; }
    .dropShadow { filter: drop-shadow(0 4px 8px #0008); }
    .layer { z-index: 999; }
  `;
  const violations = findStylePolicyViolations(
    "src/design-system/primitives/Button/button.module.css",
    source,
  );

  assert.deepEqual(
    violations.map(({ rule }) => rule).sort(),
    [
      "raw-color",
      "raw-color",
      "raw-color",
      "raw-shadow",
      "raw-shadow",
      "raw-shadow",
      "raw-z-index",
    ].sort(),
  );
  assert.ok(violations.every(({ line }) => Number.isInteger(line) && line > 0));
});

test("policy scanning ignores comments and quoted content but not rogue token files", () => {
  const commentsAndContent = `
    /* #5b5ff5; box-shadow: 0 0 2px #000; z-index: 999; */
    .label {
      content: "raw example: #fff and rgb(0 0 0)";
      color: var(--qg-text-primary);
    }
  `;
  assert.deepEqual(
    findStylePolicyViolations("src/pages/v2/example.module.css", commentsAndContent),
    [],
  );

  const rogue = findStylePolicyViolations(
    "src/design-system/tokens/rogue.module.css",
    ".rogue { color: #fff; z-index: 7; }",
  );
  assert.deepEqual(rogue.map(({ rule }) => rule).sort(), ["raw-color", "raw-z-index"]);

  const remoteFont = findStylePolicyViolations(
    "src/pages/v2/remote-font.css",
    '@font-face { font-family: "Remote"; src: url("https://fonts.invalid/font.woff2"); }',
  );
  assert.deepEqual(remoteFont.map(({ rule }) => rule), ["remote-font-url"]);
});

test("the checker fails closed when a V2 CSS scan root contains a symbolic link", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "quantgym-design-system-v2-"));
  try {
    const outside = path.join(fixtureRoot, "outside.css");
    const linked = path.join(
      fixtureRoot,
      "src/design-system/primitives/Linked/linked.module.css",
    );
    await mkdir(path.dirname(linked), { recursive: true });
    await writeFile(outside, ".outside { color: #fff; }\n", "utf8");
    await symlink(outside, linked);

    const violations = await checkDesignSystemV2({ root: fixtureRoot });
    assert.ok(violations.some(({ rule, file }) => (
      rule === "scan-symlink"
      && file === "src/design-system/primitives/Linked/linked.module.css"
    )));
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("missing approved semantic tokens and reduced-motion controls are blocking", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "quantgym-design-system-v2-"));
  try {
    const relativeFiles = [
      "docs/frontend-upgrade/design-system-contract.json",
      "src/design-system/tokens/foundations.css",
      "src/design-system/tokens/light.css",
      "src/design-system/tokens/dark.css",
      "src/design-system/tokens/typography.css",
      "src/design-system/motion/motion.css",
    ];
    for (const relativeFile of relativeFiles) {
      const target = path.join(fixtureRoot, relativeFile);
      await mkdir(path.dirname(target), { recursive: true });
      let contents = await readFile(path.join(projectRoot, relativeFile), "utf8");
      if (relativeFile.endsWith("light.css")) {
        contents = contents
          .replace(/\s*--qg-focus-ring\s*:[^;]+;/, "\n  /* --qg-focus-ring: var(--qg-action-primary); */")
          .replaceAll('data-qg-theme="light"', 'data-qg-theme="commented-light"');
        contents += '\n/* [data-qg-theme="light"] */\n';
        contents += "\n:root { --qg-action-primary: #000; }\n";
      }
      if (relativeFile.endsWith("typography.css")) {
        contents = contents.replaceAll("font-display: swap", "font-display: block");
        contents += "\n/* font-display: swap */\n";
      }
      if (relativeFile.endsWith("motion.css")) {
        contents = contents
          .replaceAll('data-qg-motion="reduced"', 'data-qg-motion="off"')
          .replaceAll(
            "@media (prefers-reduced-motion: reduce)",
            "@media (prefers-reduced-motion: no-preference)",
          );
        contents += '\n/* [data-qg-motion="reduced"] */\n';
        contents += "\n/* @media (prefers-reduced-motion: reduce) */\n";
      }
      await writeFile(target, contents, "utf8");
    }

    const violations = await checkDesignSystemV2({ root: fixtureRoot });
    assert.ok(violations.some(({ rule, evidence }) => (
      rule === "semantic-token-coverage"
      && evidence.includes("--qg-focus-ring")
    )));
    assert.ok(violations.some(({ rule }) => rule === "reduced-motion-selector"));
    assert.ok(violations.some(({ rule }) => rule === "reduced-motion-media"));
    assert.ok(violations.some(({ rule }) => rule === "theme-selector"));
    assert.ok(violations.some(({ rule, evidence }) => (
      rule === "typography-evidence"
      && evidence.includes("font-display: swap")
    )));
    assert.ok(violations.some(({ rule, evidence }) => (
      rule === "duplicate-token-definition"
      && evidence.includes("--qg-action-primary")
    )));
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("tampered or remotely loaded font assets are blocking", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "quantgym-design-system-v2-"));
  try {
    const relativeFiles = [
      "docs/frontend-upgrade/design-system-contract.json",
      "src/design-system/tokens/foundations.css",
      "src/design-system/tokens/light.css",
      "src/design-system/tokens/dark.css",
      "src/design-system/tokens/typography.css",
      "src/design-system/motion/motion.css",
      "src/design-system/assets/fonts/PlusJakartaSans-wght.woff2",
      "src/design-system/assets/fonts/SpaceGrotesk-wght.woff2",
      "src/design-system/assets/fonts/README.md",
      "src/design-system/assets/fonts/OFL-1.1.txt",
    ];
    for (const relativeFile of relativeFiles) {
      const target = path.join(fixtureRoot, relativeFile);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, await readFile(path.join(projectRoot, relativeFile)));
    }

    const plusJakartaFile = path.join(
      fixtureRoot,
      "src/design-system/assets/fonts/PlusJakartaSans-wght.woff2",
    );
    const tampered = await readFile(plusJakartaFile);
    tampered[0] ^= 0xff;
    await writeFile(plusJakartaFile, tampered);
    await writeFile(
      path.join(fixtureRoot, "src/design-system/tokens/typography.css"),
      `${await readFile(path.join(projectRoot, "src/design-system/tokens/typography.css"), "utf8")}\n.remote { src: url(https://fonts.example.invalid/font.woff2); }\n`,
      "utf8",
    );

    const violations = await checkDesignSystemV2({ root: fixtureRoot });
    assert.ok(violations.some(({ rule, file }) => (
      rule === "font-asset-integrity"
      && file.endsWith("PlusJakartaSans-wght.woff2")
    )));
    assert.ok(violations.some(({ rule }) => rule === "remote-font-url"));
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("Storybook accessibility checks lock the complete story set and fail closed on render loss", async () => {
  const source = await readFile(
    path.join(projectRoot, "scripts/check-storybook-a11y-v2.mjs"),
    "utf8",
  );

  assert.match(source, /browser\.newContext\(/);
  assert.match(source, /check: "render-ready"/);
  assert.match(source, /check: "iframe-focus-guard"/);
  assert.match(source, /new AxeBuilder\(\{ page \}\)\s*\.withTags\(/);
  assert.doesNotMatch(source, /\.include\(["']#storybook-root["']\)/);
  assert.doesNotMatch(source, /skip-a11y/);

  assert.equal(EXPECTED_STORY_IDS.length, 76);
  assert.equal(isCompleteStorySet(compareStoryIds(EXPECTED_STORY_IDS)), true);
  assert.equal(
    isCompleteStorySet(compareStoryIds(EXPECTED_STORY_IDS.slice(1))),
    false,
  );
  assert.equal(
    isStoryRenderReady({
      bodyClassNames: "sb-show-main sb-main-centered",
      documentTitle: EXPECTED_STORY_IDS[0],
      expectedStoryId: EXPECTED_STORY_IDS[0],
      rootChildCount: 0,
      visibleModalCount: 0,
    }),
    false,
  );
  assert.equal(
    isStoryRenderReady({
      bodyClassNames: "sb-show-main sb-main-fullscreen",
      documentTitle: EXPECTED_STORY_IDS[0],
      expectedStoryId: EXPECTED_STORY_IDS[0],
      rootChildCount: 0,
      visibleModalCount: 1,
    }),
    true,
  );
});

test("responsive layout CSS cannot turn Quanty into an upscaled full-width image", async () => {
  const source = await readFile(
    path.join(
      projectRoot,
      "src/design-system/patterns/QuantyImage/QuantyImage.module.css",
    ),
    "utf8",
  );

  assert.match(source, /max-inline-size:\s*min\(100%,\s*18\.75rem\)/);
  assert.doesNotMatch(source, /\.full\s*\{/);
});
