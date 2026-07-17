import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const assetRoot = path.join(root, "assets", "generated", "playful-precision");
const optimizedRoot = path.join(assetRoot, "optimized");
const srcRoot = path.join(root, "src");
const publicPagesRoot = path.join(root, "public", "pages");
const quantyAssetModulePath = path.join(srcRoot, "lib", "quantyAssets.js");
const quantyImagePath = path.join(srcRoot, "components", "common", "QuantyImage.jsx");
const authShellPath = path.join(srcRoot, "components", "shell", "AuthShell.jsx");

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const derivativeWidths = Object.freeze([160, 320, 640]);
const pngStringLiteralPattern = /(["'`])([^"'`\r\n]*\.png(?:[?#][^"'`\r\n]*)?)\1/g;
const sourceExtensions = new Set([".css", ".html", ".js", ".jsx", ".json", ".mjs", ".scss", ".ts", ".tsx"]);

const quantyAssets = Object.freeze([
  { name: "hero", slug: "hero-wave", master: "mascot-hero-v6-hq.png", width: 1114, height: 1412, newHq: true },
  { name: "trophy", slug: "trophy", master: "mascot-trophy-v3-hq.png", width: 1113, height: 1414, newHq: true },
  { name: "calculator", slug: "calculator", master: "mascot-calculator-v3-hq.png", width: 1112, height: 1415, newHq: true },
  { name: "teacher", slug: "teacher", master: "mascot-teacher-v4-hq.png", width: 1106, height: 1422, newHq: true },
  { name: "fire", slug: "fire", master: "mascot-fire-v3-hq.png", width: 1112, height: 1414, newHq: true },
  { name: "laptop", slug: "laptop", master: "mascot-laptop-v3-hq.png", width: 1113, height: 1414, newHq: true },
  { name: "levelup", slug: "levelup", master: "mascot-levelup-v2-hq.png", width: 1110, height: 1417, newHq: true },
  { name: "happy", slug: "avatar-happy", master: "avatar-happy-v3-hq.png", width: 1113, height: 1414, newHq: true },
  { name: "focused", slug: "avatar-focused", master: "avatar-focused-v3-hq.png", width: 1112, height: 1415, newHq: true },
  { name: "wow", slug: "avatar-wow", master: "avatar-wow-v4-hq.png", width: 1112, height: 1414, newHq: true },
  { name: "wink", slug: "avatar-wink", master: "avatar-wink-v2.png", width: 1100, height: 1400, newHq: false },
  { name: "interview", slug: "interview", master: "mascot-interview.png", width: 1100, height: 1400, newHq: false },
  { name: "oops", slug: "oops", master: "mascot-oops.png", width: 1100, height: 1400, newHq: false },
  { name: "poker", slug: "poker", master: "mascot-poker.png", width: 1100, height: 1400, newHq: false },
  { name: "search", slug: "search", master: "mascot-search.png", width: 1100, height: 1400, newHq: false },
  { name: "sleep", slug: "sleep", master: "mascot-sleep.png", width: 1100, height: 1400, newHq: false }
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

function readWebpDimensions(data) {
  let offset = 12;
  while (offset + 8 <= data.length) {
    const type = data.toString("ascii", offset, offset + 4);
    const chunkLength = data.readUInt32LE(offset + 4);
    const payload = offset + 8;
    const chunkEnd = payload + chunkLength;
    if (chunkEnd > data.length) return null;
    if (type === "VP8X" && chunkLength >= 10) {
      return { width: uint24le(data, payload + 4) + 1, height: uint24le(data, payload + 7) + 1 };
    }
    if (type === "VP8L" && chunkLength >= 5 && data[payload] === 0x2f) {
      const b1 = data[payload + 1];
      const b2 = data[payload + 2];
      const b3 = data[payload + 3];
      const b4 = data[payload + 4];
      return {
        width: 1 + b1 + ((b2 & 0x3f) << 8),
        height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10)
      };
    }
    if (
      type === "VP8 "
      && chunkLength >= 10
      && data[payload + 3] === 0x9d
      && data[payload + 4] === 0x01
      && data[payload + 5] === 0x2a
    ) {
      return {
        width: data.readUInt16LE(payload + 6) & 0x3fff,
        height: data.readUInt16LE(payload + 8) & 0x3fff
      };
    }
    offset = chunkEnd + (chunkLength % 2);
  }
  return null;
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

  const dimensions = readWebpDimensions(data);
  const expectedHeight = Math.ceil((asset.height * candidateWidth) / asset.width);
  if (!dimensions) {
    fail(check, target, "WebP canvas dimensions could not be decoded");
  } else if (dimensions.width !== candidateWidth || dimensions.height !== expectedHeight) {
    fail(check, target, "unexpected responsive WebP dimensions", {
      expected: `${candidateWidth}x${expectedHeight}`,
      actual: `${dimensions.width}x${dimensions.height}`
    });
  }

  return { width: candidateWidth, bytes: data.length };
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
  sourceContracts: {
    responsiveImageProps: ["srcSet", "sizes", "width", "height", "fetchPriority"],
    authPriorityHero: true,
    scannedRoots: [repoPath(srcRoot), repoPath(publicPagesRoot)],
    directPngAllowlistFiles: [repoPath(quantyAssetModulePath)]
  },
  alphaMetrics: pngSummaries
}, null, 2));
