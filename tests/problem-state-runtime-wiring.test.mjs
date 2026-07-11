import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createProblemPersonalStateController } from "../src/modules/problems/personalStateController.js";
import {
  mergeProblemStates as mergeProblemStateLists,
  normalizeProblemState
} from "../src/modules/problems/data.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("runtime wiring keeps repeated problem-save toggles in one current record", () => {
  const runtimeSource = fs.readFileSync(
    path.join(root, "src/app/createAppContext/slices/impl/initRuntimeSlice.impl.js"),
    "utf8"
  );
  const runtimeReturn = runtimeSource.slice(runtimeSource.lastIndexOf("return {"));
  assert.match(runtimeReturn, /\bnormalizeProblemState\b/);
  assert.match(runtimeReturn, /\bmergeProblemStates\b/);

  const state = { problemStates: [] };
  const controller = createProblemPersonalStateController({
    getState: () => state,
    normalizeProblemState,
    mergeProblemStates: (...lists) => mergeProblemStateLists(lists),
    nowIso: (() => {
      let index = 0;
      return () => `2026-07-12T00:00:0${index++}.000Z`;
    })(),
    saveState() {},
    renderProblems() {}
  });
  const problemId = "quantguide-0dte-option";
  const snapshots = [];

  for (let index = 0; index < 3; index += 1) {
    controller.toggleSaved(problemId);
    snapshots.push(state.problemStates.map(({ problemId: id, favorite }) => ({ id, favorite })));
  }

  assert.deepEqual(snapshots, [
    [{ id: problemId, favorite: true }],
    [{ id: problemId, favorite: false }],
    [{ id: problemId, favorite: true }]
  ]);
});
