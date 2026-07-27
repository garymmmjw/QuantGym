import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// GitHub's ubuntu-24.04 runners are amd64; keep local rasterization on the same architecture.
const platform = "linux/amd64";
const image = [
  "mcr.microsoft.com/playwright:v1.61.1-noble",
  "sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48",
].join("@");
const nodeArchiveUrl = (
  "https://nodejs.org/dist/v20.20.2/node-v20.20.2-linux-x64.tar.gz"
);
// Node.js v20.20.2 signed release SHASUMS256 entry for linux-x64.tar.gz.
const nodeArchiveSha256 = (
  "19e56f0825510207dd904f087fe52faa0a4eb6b2aab5f0ea7a33830d04888b8b"
);
const nodeModulesVolume = "quantgym-playwright-1-61-1-node-modules";
const npmCacheVolume = "quantgym-playwright-npm-10-8-2-cache";
const linuxSnapshotCount = 29;
const hostUid = typeof process.getuid === "function" ? String(process.getuid()) : "";
const hostGid = typeof process.getgid === "function" ? String(process.getgid()) : "";

const containerCommand = `
set -euo pipefail
node_archive="$(mktemp --suffix=.tar.gz)"
cleanup_node_archive() {
  rm -f "$node_archive"
}
trap cleanup_node_archive EXIT
curl --fail --silent --show-error --location \
  --proto '=https' --tlsv1.2 \
  --output "$node_archive" \
  '${nodeArchiveUrl}'
printf '%s  %s\\n' '${nodeArchiveSha256}' "$node_archive" \
  | sha256sum --check --strict -
tar -xzf "$node_archive" -C /usr/local --strip-components=1
cleanup_node_archive
trap - EXIT
npm install --global npm@10.8.2
test "$(node --version)" = "v20.20.2"
test "$(npm --version)" = "10.8.2"
npm ci
npm run test:e2e:v2 -- --grep '@visual:' --update-snapshots --retries=0 --timeout=300000
snapshot_count="$(find tests/e2e-v2 -type f -name '*-linux.png' | wc -l | tr -d ' ')"
test "$snapshot_count" = "${linuxSnapshotCount}"
if test -n "\${HOST_UID}" && test -n "\${HOST_GID}"; then
  find tests/e2e-v2 -type f -name '*-linux.png' -exec chown "\${HOST_UID}:\${HOST_GID}" {} +
fi
`;

console.log(`Updating ${linuxSnapshotCount} Linux visual baselines with ${image} (${platform}).`);

const result = spawnSync(
  "docker",
  [
    "run",
    "--rm",
    "--init",
    "--ipc=host",
    "--platform",
    platform,
    "--volume",
    `${repositoryRoot}:/work`,
    "--volume",
    `${nodeModulesVolume}:/work/node_modules`,
    "--volume",
    `${npmCacheVolume}:/root/.npm`,
    "--workdir",
    "/work",
    "--env",
    "CI=true",
    // Bind-mounted worktrees cannot resolve the host-only path in their .git pointer.
    "--env",
    "QUANTGYM_BUILD_SOURCE=test",
    "--env",
    "QUANTGYM_BUILD_BRANCH=codex/frontend-v2-preview",
    "--env",
    `HOST_UID=${hostUid}`,
    "--env",
    `HOST_GID=${hostGid}`,
    image,
    "bash",
    "-lc",
    containerCommand,
  ],
  {
    cwd: repositoryRoot,
    env: process.env,
    stdio: "inherit",
  },
);

if (result.error) {
  console.error(`Unable to run Docker: ${result.error.message}`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
