import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";

const root = process.cwd();
const assetRoot = path.join(root, "assets", "generated", "playful-precision");
const optimizedRoot = path.join(assetRoot, "optimized");
const designManifestPath = path.join(assetRoot, "manifest.json");
const runtimeManifestPath = path.join(assetRoot, "quanty-runtime-manifest.json");
const srcRoot = path.join(root, "src");
const publicPagesRoot = path.join(root, "public", "pages");
const quantyAssetModulePath = path.join(srcRoot, "lib", "quantyAssets.js");
const quantyImagePath = path.join(srcRoot, "components", "common", "QuantyImage.jsx");
const authShellPath = path.join(srcRoot, "components", "shell", "AuthShell.jsx");
const v2QuantyRoot = path.join(srcRoot, "design-system", "patterns", "QuantyImage");
const v2QuantyAssetMapPath = path.join(v2QuantyRoot, "quantyAssets.generated.ts");

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const derivativeWidths = Object.freeze([160, 320, 640]);
const writeRuntimeManifest = process.argv.includes("--write-runtime-manifest");
const writeV2AssetMap = process.argv.includes("--write-v2-asset-map");
const pngStringLiteralPattern = /(["'`])([^"'`\r\n]*\.png(?:[?#][^"'`\r\n]*)?)\1/g;
const sourceExtensions = new Set([".css", ".html", ".js", ".jsx", ".json", ".mjs", ".scss", ".ts", ".tsx"]);

const quantyAssets = Object.freeze([
  { name: "hero", role: "auth-hero", category: "mascot", slug: "hero-wave", master: "mascot-hero-v6-hq.png", width: 1114, height: 1412, newHq: true },
  { name: "trophy", role: "achievement-reward", category: "mascot", slug: "trophy", master: "mascot-trophy-v3-hq.png", width: 1113, height: 1414, newHq: true },
  { name: "calculator", role: "calculator-practice", category: "mascot", slug: "calculator", master: "mascot-calculator-v3-hq.png", width: 1112, height: 1415, newHq: true },
  { name: "teacher", role: "learning-coach", category: "mascot", slug: "teacher", master: "mascot-teacher-v4-hq.png", width: 1106, height: 1422, newHq: true },
  { name: "fire", role: "streak-reward", category: "mascot", slug: "fire", master: "mascot-fire-v3-hq.png", width: 1112, height: 1414, newHq: true },
  { name: "laptop", role: "workspace-study", category: "mascot", slug: "laptop", master: "mascot-laptop-v3-hq.png", width: 1113, height: 1414, newHq: true },
  { name: "levelup", role: "level-up-reward", category: "mascot", slug: "levelup", master: "mascot-levelup-v2-hq.png", width: 1110, height: 1417, newHq: true },
  { name: "happy", role: "avatar-happy", category: "avatar", slug: "avatar-happy", master: "avatar-happy-v3-hq.png", width: 1113, height: 1414, newHq: true },
  { name: "focused", role: "avatar-focused", category: "avatar", slug: "avatar-focused", master: "avatar-focused-v3-hq.png", width: 1112, height: 1415, newHq: true },
  { name: "wow", role: "avatar-surprised", category: "avatar", slug: "avatar-wow", master: "avatar-wow-v4-hq.png", width: 1112, height: 1414, newHq: true },
  { name: "wink", role: "avatar-wink", category: "avatar", slug: "avatar-wink", master: "avatar-wink-v2.png", width: 1100, height: 1400, newHq: false },
  { name: "interview", role: "interview-practice", category: "mascot", slug: "interview", master: "mascot-interview.png", width: 1100, height: 1400, newHq: false },
  { name: "oops", role: "error-recovery", category: "mascot", slug: "oops", master: "mascot-oops.png", width: 1100, height: 1400, newHq: false },
  { name: "poker", role: "poker-practice", category: "mascot", slug: "poker", master: "mascot-poker.png", width: 1100, height: 1400, newHq: false },
  { name: "search", role: "search-empty-state", category: "mascot", slug: "search", master: "mascot-search.png", width: 1100, height: 1400, newHq: false },
  { name: "sleep", role: "idle-empty-state", category: "mascot", slug: "sleep", master: "mascot-sleep.png", width: 1100, height: 1400, newHq: false }
]);

const legacyQuantyFilenames = Object.freeze({
  "mascot-hero-v5-clean.png": "hero",
  "mascot-trophy-v2.png": "trophy",
  "mascot-calculator-v2.png": "calculator",
  "mascot-teacher-v2.png": "teacher",
  "mascot-fire-v2.png": "fire",
  "mascot-laptop-v2.png": "laptop",
  "mascot-levelup.png": "levelup",
  "avatar-happy-v2.png": "happy",
  "avatar-focused-v2.png": "focused",
  "avatar-wow-v2.png": "wow",
  "avatar-wink-v2.png": "wink",
  "mascot-interview.png": "interview",
  "mascot-oops.png": "oops",
  "mascot-poker.png": "poker",
  "mascot-search.png": "search",
  "mascot-sleep.png": "sleep"
});
const quantyPngNames = new Set([
  ...quantyAssets.map((asset) => asset.master),
  ...Object.keys(legacyQuantyFilenames)
]);

const failures = [];
const pngSummaries = [];
const webpSummaries = [];

function repoPath(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

function fail(check, target, message, details = undefined) {
  failures.push({ check, target, message, ...(details ? { details } : {}) });
}

function readFile(filePath, check) {
  try {
    return fs.readFileSync(filePath);
  } catch (error) {
    fail(check, repoPath(filePath), "file could not be read", { error: error.message });
    return null;
  }
}

function readText(filePath, check) {
  const data = readFile(filePath, check);
  return data ? data.toString("utf8") : "";
}

function ratio(value, total) {
  return Number((value / total).toFixed(6));
}

function paethPredictor(left, up, upperLeft) {
  const estimate = left + up - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) return left;
  if (upDistance <= upperLeftDistance) return up;
  return upperLeft;
}

function decodePng(filePath, asset) {
  const check = "png-master";
  const target = repoPath(filePath);
  const data = readFile(filePath, check);
  if (!data) return null;

  if (data.length < 33 || !data.subarray(0, pngSignature.length).equals(pngSignature)) {
    fail(check, target, "invalid PNG signature");
    return null;
  }

  let offset = pngSignature.length;
  let ihdr = null;
  let sawIend = false;
  const idatChunks = [];
  while (offset + 12 <= data.length) {
    const chunkLength = data.readUInt32BE(offset);
    const type = data.toString("ascii", offset + 4, offset + 8);
    const payloadStart = offset + 8;
    const payloadEnd = payloadStart + chunkLength;
    const chunkEnd = payloadEnd + 4;
    if (chunkEnd > data.length) {
      fail(check, target, `truncated ${type || "unknown"} PNG chunk`);
      return null;
    }
    if (!ihdr && type !== "IHDR") {
      fail(check, target, "IHDR must be the first PNG chunk");
      return null;
    }
    if (type === "IHDR") {
      if (ihdr || chunkLength !== 13) {
        fail(check, target, "PNG must contain one 13-byte IHDR chunk");
        return null;
      }
      ihdr = data.subarray(payloadStart, payloadEnd);
    } else if (type === "IDAT") {
      idatChunks.push(data.subarray(payloadStart, payloadEnd));
    } else if (type === "IEND") {
      sawIend = true;
      break;
    }
    offset = chunkEnd;
  }

  if (!ihdr || !sawIend || idatChunks.length === 0) {
    fail(check, target, "PNG is missing IHDR, IDAT, or IEND data");
    return null;
  }

  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const compressionMethod = ihdr[10];
  const filterMethod = ihdr[11];
  const interlaceMethod = ihdr[12];

  if (width !== asset.width || height !== asset.height) {
    fail(check, target, "unexpected master dimensions", {
      expected: `${asset.width}x${asset.height}`,
      actual: `${width}x${height}`
    });
  }
  if (bitDepth !== 8 || colorType !== 6) {
    fail(check, target, "master must be an 8-bit RGBA PNG", { bitDepth, colorType });
    return null;
  }
  if (compressionMethod !== 0 || filterMethod !== 0 || interlaceMethod !== 0) {
    fail(check, target, "master must use standard, non-interlaced PNG encoding", {
      compressionMethod,
      filterMethod,
      interlaceMethod
    });
    return null;
  }

  let inflated;
  try {
    inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  } catch (error) {
    fail(check, target, "PNG image data could not be inflated", { error: error.message });
    return null;
  }

  const bytesPerPixel = 4;
  const rowBytes = width * bytesPerPixel;
  const expectedInflatedBytes = height * (rowBytes + 1);
  if (inflated.length !== expectedInflatedBytes) {
    fail(check, target, "unexpected decoded PNG byte length", {
      expected: expectedInflatedBytes,
      actual: inflated.length
    });
    return null;
  }

  let previousRow = Buffer.alloc(rowBytes);
  let currentRow = Buffer.alloc(rowBytes);
  let inputOffset = 0;
  let transparentPixels = 0;
  let visiblePixels = 0;
  let opaquePixels = 0;
  let semiTransparentPixels = 0;
  let boundaryPixels = 0;
  let chromaBoundaryPixels = 0;
  const semiTransparentLevels = new Set();
  const cornerAlpha = [];

  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[inputOffset];
    inputOffset += 1;
    if (filterType > 4) {
      fail(check, target, "unsupported PNG row filter", { row: y, filterType });
      return null;
    }

    for (let x = 0; x < rowBytes; x += 1) {
      const encoded = inflated[inputOffset + x];
      const left = x >= bytesPerPixel ? currentRow[x - bytesPerPixel] : 0;
      const up = previousRow[x];
      const upperLeft = x >= bytesPerPixel ? previousRow[x - bytesPerPixel] : 0;
      let reconstructed = encoded;
      if (filterType === 1) reconstructed += left;
      else if (filterType === 2) reconstructed += up;
      else if (filterType === 3) reconstructed += Math.floor((left + up) / 2);
      else if (filterType === 4) reconstructed += paethPredictor(left, up, upperLeft);
      currentRow[x] = reconstructed & 0xff;
    }
    inputOffset += rowBytes;

    for (let x = 0; x < width; x += 1) {
      const pixelOffset = x * bytesPerPixel;
      const red = currentRow[pixelOffset];
      const green = currentRow[pixelOffset + 1];
      const blue = currentRow[pixelOffset + 2];
      const alpha = currentRow[pixelOffset + 3];
      if (alpha === 0) transparentPixels += 1;
      else {
        visiblePixels += 1;
        if (alpha === 255) opaquePixels += 1;
        else {
          semiTransparentPixels += 1;
          semiTransparentLevels.add(alpha);
        }
        const leftAlpha = x > 0 ? currentRow[pixelOffset - 1] : 0;
        const upperAlpha = y > 0 ? previousRow[pixelOffset + 3] : 0;
        if (leftAlpha === 0 || upperAlpha === 0) {
          boundaryPixels += 1;
          const greenKeyFringe = green > 100 && green > red * 1.5 && green > blue * 1.5;
          const magentaKeyFringe = red > 100 && blue > 100 && red > green * 1.5 && blue > green * 1.5;
          if (greenKeyFringe || magentaKeyFringe) chromaBoundaryPixels += 1;
        }
      }
      if ((y === 0 || y === height - 1) && (x === 0 || x === width - 1)) cornerAlpha.push(alpha);
    }

    const swap = previousRow;
    previousRow = currentRow;
    currentRow = swap;
    currentRow.fill(0);
  }

  const totalPixels = width * height;
  const transparentRatio = ratio(transparentPixels, totalPixels);
  const foregroundRatio = ratio(visiblePixels, totalPixels);
  const opaqueRatio = ratio(opaquePixels, totalPixels);
  const semiTransparentRatio = ratio(semiTransparentPixels, totalPixels);
  const chromaBoundaryRatio = boundaryPixels ? ratio(chromaBoundaryPixels, boundaryPixels) : 0;

  if (cornerAlpha.length !== 4 || cornerAlpha.some((alpha) => alpha !== 0)) {
    fail(check, target, "all four master corners must be fully transparent", { cornerAlpha });
  }
  if (transparentRatio < 0.2 || transparentRatio > 0.95) {
    fail(check, target, "transparent pixel ratio is outside the mascot-safe range", { transparentRatio });
  }
  if (foregroundRatio < 0.05 || foregroundRatio > 0.8 || opaqueRatio < 0.01) {
    fail(check, target, "foreground pixel ratio is outside the mascot-safe range", {
      foregroundRatio,
      opaqueRatio
    });
  }
  if (asset.newHq && !asset.allowHardEdge) {
    if (semiTransparentLevels.size < 16 || semiTransparentRatio < 0.0001) {
      fail(check, target, "new HQ master lacks a sufficiently graduated alpha edge", {
        semiTransparentLevels: semiTransparentLevels.size,
        semiTransparentRatio
      });
    }
  }
  if (asset.newHq && chromaBoundaryRatio > 0.02) {
    fail(check, target, "new HQ master contains likely chroma-key fringe pixels", {
      boundaryPixels,
      chromaBoundaryPixels,
      chromaBoundaryRatio
    });
  }

  return {
    name: asset.name,
    master: asset.master,
    width,
    height,
    bytes: data.length,
    sha256: sha256(data),
    alpha: {
      present: true,
      transparentBackground: cornerAlpha.length === 4 && cornerAlpha.every((alpha) => alpha === 0)
    },
    dimensions: `${width}x${height}`,
    transparentRatio,
    foregroundRatio,
    semiTransparentLevels: semiTransparentLevels.size,
    chromaBoundaryRatio,
    hardEdgeException: Boolean(asset.allowHardEdge)
  };
}

function uint24le(data, offset) {
  return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16);
}

function readWebpMetadata(data) {
  let offset = 12;
  let dimensions = null;
  let hasAlpha = false;
  while (offset + 8 <= data.length) {
    const type = data.toString("ascii", offset, offset + 4);
    const chunkLength = data.readUInt32LE(offset + 4);
    const payload = offset + 8;
    const chunkEnd = payload + chunkLength;
    if (chunkEnd > data.length) return null;
    if (type === "VP8X" && chunkLength >= 10) {
      dimensions = {
        width: uint24le(data, payload + 4) + 1,
        height: uint24le(data, payload + 7) + 1
      };
      hasAlpha ||= Boolean(data[payload] & 0x10);
    }
    if (type === "VP8L" && chunkLength >= 5 && data[payload] === 0x2f) {
      const b1 = data[payload + 1];
      const b2 = data[payload + 2];
      const b3 = data[payload + 3];
      const b4 = data[payload + 4];
      dimensions ||= {
        width: 1 + b1 + ((b2 & 0x3f) << 8),
        height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10)
      };
      hasAlpha ||= Boolean(b4 & 0x10);
    }
    if (
      type === "VP8 "
      && chunkLength >= 10
      && data[payload + 3] === 0x9d
      && data[payload + 4] === 0x01
      && data[payload + 5] === 0x2a
    ) {
      dimensions ||= {
        width: data.readUInt16LE(payload + 6) & 0x3fff,
        height: data.readUInt16LE(payload + 8) & 0x3fff
      };
    }
    if (type === "ALPH") hasAlpha = true;
    offset = chunkEnd + (chunkLength % 2);
  }
  return dimensions ? { ...dimensions, hasAlpha } : null;
}

function checkWebp(filePath, asset, candidateWidth) {
  const check = "webp-derivative";
  const target = repoPath(filePath);
  const data = readFile(filePath, check);
  if (!data) return null;
  if (
    data.length < 20
    || data.toString("ascii", 0, 4) !== "RIFF"
    || data.toString("ascii", 8, 12) !== "WEBP"
  ) {
    fail(check, target, "invalid RIFF/WEBP signature");
    return null;
  }
  if (data.readUInt32LE(4) + 8 !== data.length) {
    fail(check, target, "RIFF length does not match file size", {
      declared: data.readUInt32LE(4) + 8,
      actual: data.length
    });
  }

  const maxBytes = candidateWidth === 160 ? 128 * 1024 : candidateWidth === 320 ? 384 * 1024 : 1024 * 1024;
  if (data.length < 2048 || data.length > maxBytes) {
    fail(check, target, "responsive WebP file size is outside the expected range", {
      minBytes: 2048,
      maxBytes,
      actualBytes: data.length
    });
  }

  const metadata = readWebpMetadata(data);
  const expectedHeight = Math.ceil((asset.height * candidateWidth) / asset.width);
  if (!metadata) {
    fail(check, target, "WebP canvas dimensions could not be decoded");
  } else if (metadata.width !== candidateWidth || metadata.height !== expectedHeight) {
    fail(check, target, "unexpected responsive WebP dimensions", {
      expected: `${candidateWidth}x${expectedHeight}`,
      actual: `${metadata.width}x${metadata.height}`
    });
  }
  if (metadata && !metadata.hasAlpha) {
    fail(check, target, "responsive WebP must preserve the transparent mascot background");
  }

  return {
    width: metadata?.width ?? candidateWidth,
    height: metadata?.height ?? expectedHeight,
    bytes: data.length,
    sha256: sha256(data),
    alpha: { present: Boolean(metadata?.hasAlpha) }
  };
}

function walkSourceFiles(directory) {
  const files = [];
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    fail("source-scan", repoPath(directory), "source directory could not be scanned", { error: error.message });
    return files;
  }
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkSourceFiles(fullPath));
    else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function cleanPngReference(reference) {
  return reference.split(/[?#]/, 1)[0].replaceAll("\\", "/");
}

function isQuantyPngReference(reference) {
  const cleanReference = cleanPngReference(reference);
  const filename = path.posix.basename(cleanReference);
  return quantyPngNames.has(filename)
    || (cleanReference.includes("playful-precision/") && /^(?:avatar|mascot)-.+\.png$/.test(filename));
}

function isAllowedPngReference(filePath, reference, source, index) {
  const relativePath = repoPath(filePath);
  if (relativePath !== repoPath(quantyAssetModulePath)) return false;
  const filename = path.posix.basename(cleanPngReference(reference));
  const lineStart = source.lastIndexOf("\n", index) + 1;
  const lineEnd = source.indexOf("\n", index);
  const line = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd);
  if (quantyAssets.some((asset) => asset.master === filename) && line.includes("defineAsset(")) return true;
  const mapStart = source.search(/const\s+LEGACY_QUANTY_FILENAMES\s*=\s*Object\.freeze\(\s*\{/);
  const mapEnd = mapStart === -1 ? -1 : source.indexOf("});", mapStart);
  return Object.hasOwn(legacyQuantyFilenames, filename)
    && mapStart !== -1
    && mapEnd !== -1
    && index > mapStart
    && index < mapEnd;
}

function checkSourceContracts() {
  const quantyAssetModule = readText(quantyAssetModulePath, "source-contract");
  for (const asset of quantyAssets) {
    const escapedSlug = asset.slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedMaster = asset.master.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const recordPattern = new RegExp(
      `defineAsset\\(\\s*["']${escapedSlug}["']\\s*,\\s*${asset.width}\\s*,\\s*${asset.height}\\s*,\\s*["']${escapedMaster}["']\\s*\\)`
    );
    if (!recordPattern.test(quantyAssetModule)) {
      fail("source-contract", repoPath(quantyAssetModulePath), `missing or incorrect master record for ${asset.name}`);
    }
  }
  for (const [filename, assetName] of Object.entries(legacyQuantyFilenames)) {
    const escapedFilename = filename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedAssetName = assetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const migrationPattern = new RegExp(`["']${escapedFilename}["']\\s*:\\s*["']${escapedAssetName}["']`);
    if (!migrationPattern.test(quantyAssetModule)) {
      fail("source-contract", repoPath(quantyAssetModulePath), `missing legacy migration for ${filename}`);
    }
  }

  const quantyImage = readText(quantyImagePath, "source-contract");
  for (const prop of ["srcSet", "sizes", "width", "height", "fetchPriority"]) {
    if (!new RegExp(`\\b${prop}\\b`).test(quantyImage)) {
      fail("source-contract", repoPath(quantyImagePath), `QuantyImage must provide ${prop}`);
    }
  }

  const authShell = readText(authShellPath, "source-contract");
  const quantyTags = authShell.match(/<QuantyImage\b[\s\S]*?\/>/g) || [];
  const hasPriorityHero = quantyTags.some((tag) => (
    /\basset\s*=\s*["']hero["']/.test(tag)
    && /\bpriority(?:\s|=|\/>)/.test(tag)
  ));
  if (!hasPriorityHero) {
    fail("source-contract", repoPath(authShellPath), "AuthShell must render the hero with a priority QuantyImage");
  }
  if (!/import\s*\{[^}]*\bQuantyImage\b[^}]*\}\s*from\s*["'][^"']+QuantyImage\.jsx["']/.test(authShell)) {
    fail("source-contract", repoPath(authShellPath), "AuthShell must import QuantyImage");
  }

  for (const sourceRoot of [srcRoot, publicPagesRoot]) {
    for (const filePath of walkSourceFiles(sourceRoot)) {
      const source = readText(filePath, "source-scan");
      pngStringLiteralPattern.lastIndex = 0;
      for (const match of source.matchAll(pngStringLiteralPattern)) {
        const reference = match[2];
        if (!isQuantyPngReference(reference)) continue;
        if (!isAllowedPngReference(filePath, reference, source, match.index)) {
          fail("source-scan", repoPath(filePath), "active source must not directly reference a mascot PNG", {
            line: lineNumberAt(source, match.index),
            reference
          });
        }
      }
    }
  }
}

function buildRuntimeManifest() {
  const designManifestData = readFile(designManifestPath, "runtime-manifest-source");
  if (!designManifestData) return null;

  let designManifest;
  try {
    designManifest = JSON.parse(designManifestData.toString("utf8"));
  } catch (error) {
    fail("runtime-manifest-source", repoPath(designManifestPath), "design reference manifest is not valid JSON", {
      error: error.message
    });
    return null;
  }

  if (designManifest.assetCount !== 36 || !Array.isArray(designManifest.assets) || designManifest.assets.length !== 36) {
    fail(
      "runtime-manifest-source",
      repoPath(designManifestPath),
      "design reference manifest must retain its original 36-item inventory",
      {
        declaredAssetCount: designManifest.assetCount,
        actualAssetCount: Array.isArray(designManifest.assets) ? designManifest.assets.length : null
      }
    );
  }

  const mastersByName = new Map(pngSummaries.map((summary) => [summary.name, summary]));
  const variantsBySlug = new Map(webpSummaries.map((summary) => [summary.slug, summary.variants]));
  if (mastersByName.size !== quantyAssets.length || variantsBySlug.size !== quantyAssets.length) return null;

  return {
    schemaVersion: 1,
    kind: "quanty-runtime-assets",
    hashAlgorithm: "sha256",
    sourceDesignManifest: {
      path: repoPath(designManifestPath),
      assetCount: 36,
      sha256: sha256(designManifestData)
    },
    variantWidths: [...derivativeWidths],
    counts: {
      logicalAssets: quantyAssets.length,
      masters: quantyAssets.length,
      optimizedVariants: quantyAssets.length * derivativeWidths.length
    },
    assets: quantyAssets.map((asset) => {
      const master = mastersByName.get(asset.name);
      const variants = variantsBySlug.get(asset.slug);
      return {
        logicalName: asset.name,
        role: asset.role,
        category: asset.category,
        slug: asset.slug,
        newHq: asset.newHq,
        master: {
          path: repoPath(path.join(assetRoot, asset.master)),
          mimeType: "image/png",
          width: master.width,
          height: master.height,
          bytes: master.bytes,
          sha256: master.sha256,
          alpha: master.alpha
        },
        variants: variants.map((variant) => ({
          path: repoPath(path.join(optimizedRoot, `${asset.slug}-${variant.width}.webp`)),
          mimeType: "image/webp",
          width: variant.width,
          height: variant.height,
          bytes: variant.bytes,
          sha256: variant.sha256,
          alpha: variant.alpha
        }))
      };
    })
  };
}

function canonicalManifestText(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function updateRuntimeManifest(manifest) {
  try {
    fs.writeFileSync(runtimeManifestPath, canonicalManifestText(manifest));
  } catch (error) {
    fail("runtime-manifest", repoPath(runtimeManifestPath), "runtime manifest could not be written", {
      error: error.message
    });
  }
}

function checkRuntimeManifest(manifest) {
  const actualData = readFile(runtimeManifestPath, "runtime-manifest");
  if (!actualData) return;
  const expectedText = canonicalManifestText(manifest);
  const actualText = actualData.toString("utf8");
  if (actualText !== expectedText) {
    fail("runtime-manifest", repoPath(runtimeManifestPath), "runtime manifest has drifted from the validated asset inventory", {
      expectedSha256: sha256(Buffer.from(expectedText)),
      actualSha256: sha256(actualData),
      updateCommand: "npm run check:quanty-assets -- --write-runtime-manifest"
    });
  }
}

function v2ImportIdentifier(logicalName, width) {
  return `${logicalName}${width}`;
}

function buildV2AssetMapSource(manifest) {
  const imports = manifest.assets.flatMap((asset) => asset.variants.map((variant) => (
    `import ${v2ImportIdentifier(asset.logicalName, variant.width)} from "../../../../${variant.path}";`
  ))).join("\n");
  const names = manifest.assets.map((asset) => `  "${asset.logicalName}",`).join("\n");
  const records = manifest.assets.map((asset) => {
    const variants = asset.variants.map((variant) => (
      `      { src: ${v2ImportIdentifier(asset.logicalName, variant.width)}, width: ${variant.width}, height: ${variant.height} },`
    )).join("\n");
    return `  ${asset.logicalName}: Object.freeze({\n`
      + `    logicalName: "${asset.logicalName}",\n`
      + `    role: "${asset.role}",\n`
      + `    category: "${asset.category}",\n`
      + `    intrinsicWidth: ${asset.master.width},\n`
      + `    intrinsicHeight: ${asset.master.height},\n`
      + "    variants: Object.freeze([\n"
      + `${variants}\n`
      + "    ] as const),\n"
      + "  }),";
  }).join("\n");

  return `/* This file is generated by scripts/check-quanty-assets.mjs. Do not edit by hand. */\n`
    + `${imports}\n\n`
    + "export type QuantyVariantWidth = 160 | 320 | 640;\n"
    + "export type QuantyAssetCategory = \"mascot\" | \"avatar\";\n\n"
    + "export type QuantyAssetVariant = Readonly<{\n"
    + "  src: string;\n"
    + "  width: QuantyVariantWidth;\n"
    + "  height: number;\n"
    + "}>;\n\n"
    + "export type QuantyAssetDefinition = Readonly<{\n"
    + "  logicalName: QuantyAssetName;\n"
    + "  role: string;\n"
    + "  category: QuantyAssetCategory;\n"
    + "  intrinsicWidth: number;\n"
    + "  intrinsicHeight: number;\n"
    + "  variants: readonly QuantyAssetVariant[];\n"
    + "}>;\n\n"
    + "export const QUANTY_ASSET_NAMES = Object.freeze([\n"
    + `${names}\n`
    + "] as const);\n\n"
    + "export type QuantyAssetName = (typeof QUANTY_ASSET_NAMES)[number];\n\n"
    + "export const QUANTY_ASSETS: Readonly<Record<QuantyAssetName, QuantyAssetDefinition>> = Object.freeze({\n"
    + `${records}\n`
    + "});\n";
}

function updateV2AssetMap(source) {
  try {
    fs.mkdirSync(v2QuantyRoot, { recursive: true });
    fs.writeFileSync(v2QuantyAssetMapPath, source);
  } catch (error) {
    fail("v2-asset-map", repoPath(v2QuantyAssetMapPath), "V2 asset map could not be written", {
      error: error.message
    });
  }
}

function checkV2AssetMap(manifest) {
  const expectedSource = buildV2AssetMapSource(manifest);
  const actualSource = readText(v2QuantyAssetMapPath, "v2-asset-map");
  if (actualSource !== expectedSource) {
    fail("v2-asset-map", repoPath(v2QuantyAssetMapPath), "V2 asset map has drifted from the repaired runtime manifest", {
      expectedSha256: sha256(Buffer.from(expectedSource)),
      actualSha256: sha256(Buffer.from(actualSource)),
      updateCommand: "npm run check:quanty-assets -- --write-v2-asset-map"
    });
  }

  for (const filePath of walkSourceFiles(v2QuantyRoot)) {
    const source = readText(filePath, "v2-source-contract");
    const forbiddenImports = [
      /(?:from\s*|import\s*\(\s*)["'][^"']*components\/common\/QuantyImage(?:\.jsx)?["']/,
      /(?:from\s*|import\s*\(\s*)["'][^"']*lib\/quantyAssets(?:\.js)?["']/,
      /(?:from\s*|import\s*\(\s*)["'][^"']*quanty-runtime-manifest\.json["']/
    ];
    for (const forbiddenImport of forbiddenImports) {
      if (forbiddenImport.test(source)) {
        fail("v2-source-contract", repoPath(filePath), "V2 Quanty code must not import legacy or runtime-manifest modules");
      }
    }
  }
}

for (const asset of quantyAssets) {
  const summary = decodePng(path.join(assetRoot, asset.master), asset);
  if (summary) pngSummaries.push(summary);
}

const expectedWebpNames = new Set(
  quantyAssets.flatMap((asset) => derivativeWidths.map((width) => `${asset.slug}-${width}.webp`))
);
let optimizedEntries = [];
try {
  optimizedEntries = fs.readdirSync(optimizedRoot, { withFileTypes: true });
} catch (error) {
  fail("webp-inventory", repoPath(optimizedRoot), "optimized directory could not be read", { error: error.message });
}
const actualWebpNames = new Set(optimizedEntries.map((entry) => entry.name));
if (optimizedEntries.length !== expectedWebpNames.size) {
  fail("webp-inventory", repoPath(optimizedRoot), "optimized directory must contain exactly 48 derivative files", {
    expected: expectedWebpNames.size,
    actual: optimizedEntries.length
  });
}
for (const entry of optimizedEntries) {
  if (!entry.isFile() || !expectedWebpNames.has(entry.name)) {
    fail("webp-inventory", repoPath(path.join(optimizedRoot, entry.name)), "unexpected optimized directory entry");
  }
}
for (const expectedName of expectedWebpNames) {
  if (!actualWebpNames.has(expectedName)) {
    fail("webp-inventory", repoPath(path.join(optimizedRoot, expectedName)), "missing responsive WebP derivative");
  }
}

for (const asset of quantyAssets) {
  const variants = [];
  for (const candidateWidth of derivativeWidths) {
    const filePath = path.join(optimizedRoot, `${asset.slug}-${candidateWidth}.webp`);
    const summary = checkWebp(filePath, asset, candidateWidth);
    if (summary) variants.push(summary);
  }
  if (variants.length === derivativeWidths.length) {
    for (let index = 1; index < variants.length; index += 1) {
      if (variants[index].bytes <= variants[index - 1].bytes) {
        fail("webp-derivative", asset.slug, "larger responsive variants must have a larger byte size", { variants });
        break;
      }
    }
    webpSummaries.push({ slug: asset.slug, variants });
  }
}

checkSourceContracts();

const runtimeManifest = buildRuntimeManifest();
if (runtimeManifest && writeRuntimeManifest && failures.length === 0) updateRuntimeManifest(runtimeManifest);
if (runtimeManifest) checkRuntimeManifest(runtimeManifest);
const v2AssetMapSource = runtimeManifest ? buildV2AssetMapSource(runtimeManifest) : "";
if (runtimeManifest && writeV2AssetMap && failures.length === 0) updateV2AssetMap(v2AssetMapSource);
if (runtimeManifest) checkV2AssetMap(runtimeManifest);

if (failures.length > 0) {
  console.error(JSON.stringify({
    status: "fail",
    check: "quanty-assets",
    failureCount: failures.length,
    failures
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "pass",
  check: "quanty-assets",
  logicalAssets: quantyAssets.length,
  masters: {
    validated: pngSummaries.length,
    newHq: quantyAssets.filter((asset) => asset.newHq).length,
    retained: quantyAssets.filter((asset) => !asset.newHq).length,
    graduatedAlphaChecked: quantyAssets.filter((asset) => asset.newHq && !asset.allowHardEdge).length,
    hardEdgeExceptions: quantyAssets.filter((asset) => asset.allowHardEdge).map((asset) => asset.name)
  },
  responsiveWebp: {
    validated: webpSummaries.reduce((total, asset) => total + asset.variants.length, 0),
    widths: derivativeWidths,
    directoryEntryCount: optimizedEntries.length
  },
  runtimeManifest: {
    path: repoPath(runtimeManifestPath),
    sha256: sha256(Buffer.from(canonicalManifestText(runtimeManifest))),
    sourceDesignAssetCount: runtimeManifest.sourceDesignManifest.assetCount,
    logicalAssets: runtimeManifest.counts.logicalAssets,
    masters: runtimeManifest.counts.masters,
    optimizedVariants: runtimeManifest.counts.optimizedVariants
  },
  v2AssetMap: {
    path: repoPath(v2QuantyAssetMapPath),
    sha256: sha256(Buffer.from(v2AssetMapSource)),
    staticWebpImports: runtimeManifest.counts.optimizedVariants,
    runtimeManifestImported: false,
    legacyQuantyImported: false
  },
  sourceContracts: {
    responsiveImageProps: ["srcSet", "sizes", "width", "height", "fetchPriority"],
    authPriorityHero: true,
    scannedRoots: [repoPath(srcRoot), repoPath(publicPagesRoot)],
    directPngAllowlistFiles: [repoPath(quantyAssetModulePath)]
  },
  alphaMetrics: pngSummaries
}, null, 2));
