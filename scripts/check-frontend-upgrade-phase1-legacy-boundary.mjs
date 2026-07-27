import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseAst } from "rolldown/parseAst";

import { findBoundaryViolations } from "./check-frontend-v2-boundaries.mjs";

export const LEGACY_PREVIEW_ORIGIN = (
  "https://legacy-compat.quantgym-v2-preview.pages.dev"
);

export const APPROVED_LEGACY_SANDBOX_TOKENS = Object.freeze([
  "allow-forms",
  "allow-same-origin",
  "allow-scripts",
]);

export const APPROVED_BUSINESS_ROUTES = Object.freeze([
  { id: "overview", path: "/" },
  { id: "plan", path: "/plan" },
  { id: "problems", path: "/problems" },
  { id: "interview", path: "/interview" },
  { id: "tools", path: "/tools" },
  { id: "skills", path: "/skills" },
  { id: "league", path: "/league" },
  { id: "pk", path: "/pk" },
  { id: "poker", path: "/poker" },
  { id: "experiences", path: "/experiences" },
  { id: "news", path: "/news" },
  { id: "community", path: "/community" },
  { id: "messages", path: "/messages" },
  { id: "network", path: "/network" },
  { id: "resume", path: "/resume" },
  { id: "jobs", path: "/jobs" },
  { id: "companies", path: "/companies" },
  { id: "library", path: "/library" },
  { id: "courses", path: "/courses" },
  { id: "memory", path: "/memory" },
  { id: "settings", path: "/settings" },
  { id: "account", path: "/account" },
]);

export const APPROVED_NATIVE_BUSINESS_ROUTES = Object.freeze([
  { id: "overview", path: "/" },
  { id: "plan", path: "/plan" },
  { id: "problems", path: "/problems" },
]);

export const APPROVED_UNMIGRATED_ROUTES = Object.freeze(
  APPROVED_BUSINESS_ROUTES.filter(({ id }) => (
    !APPROVED_NATIVE_BUSINESS_ROUTES.some((route) => route.id === id)
  )),
);

export const PHASE1_SYSTEM_SURFACES = Object.freeze([
  "system:auth",
  "system:desktop-shell",
  "system:mobile-shell",
  "system:global-search",
  "system:notifications-toast",
  "system:todo",
  "system:theme-language",
  "system:network-recovery",
]);

const REQUIRED_FILES = Object.freeze({
  adapter: "src/legacy-preview/LegacyRouteAdapter.tsx",
  adapterStyles: "src/legacy-preview/adapter.module.css",
  navigation: "src/design-system/patterns/AppShell/navigation.ts",
  ownership: "src/core/router/businessRouteOwnership.ts",
  routes: "src/legacy-preview/unmigratedRoutes.ts",
  router: "src/core/router/router.tsx",
  vite: "vite.v2.config.ts",
  build: "scripts/build-frontend-v2.mjs",
  runtime: "tests/e2e-v2/legacy-boundary.spec.ts",
});

const EXPECTED_LEGACY_PREVIEW_FILES = Object.freeze([
  "LegacyRouteAdapter.tsx",
  "adapter.module.css",
  "unmigratedRoutes.ts",
]);

export const PHASE1_PRODUCTION_SOURCE_ROOTS = Object.freeze([
  "src/core",
  "src/design-system",
  "src/domains",
  "src/pages/plan",
  "src/pages/training",
  "src/pages/v2",
  "src/shared",
]);

const LEGACY_TOP_LEVEL_PATTERNS = Object.freeze([
  /\bsrc\/main\.jsx\b/u,
  /\bsrc\/App\.jsx\b/u,
  /\bsrc\/router\.js\b/u,
  /(?:^|\/)src\/(?:app|components|features|layouts|modules|router|routes|state|stores|ui)\//u,
  /createAppContext/u,
  /storeBridge/u,
  /quantgym:/u,
]);

const ADAPTER_FORBIDDEN_PATTERNS = Object.freeze([
  ["TanStack Query", /@tanstack\/react-query/u],
  ["Zustand", /(?:^|["'])zustand(?:\/|["'])/mu],
  ["postMessage bridge", /\bpostMessage\b/u],
  ["message event bridge", /addEventListener\s*\(\s*["']message["']/u],
  ["message handler bridge", /\bonmessage\b/u],
  ["MessageChannel bridge", /\bMessageChannel\b/u],
  ["BroadcastChannel bridge", /\bBroadcastChannel\b/u],
  ["browser local storage", /\blocalStorage\b/u],
  ["browser session storage", /\bsessionStorage\b/u],
  ["browser IndexedDB", /\bindexedDB\b/u],
  ["V1 endpoint", /\/api\/v1(?:\/|["'`?])/u],
  ["legacy state_json", /\bstate_json\b/u],
  ["legacy state hydration", /\b(?:hydrate|rehydrate|dualWrite|dual_write)\b/u],
  ["inline iframe document", /\bsrcDoc\s*=/u],
]);

const APPROVED_ADAPTER_IMPORTS = Object.freeze([
  "../shared/i18n",
  "./adapter.module.css",
  "./unmigratedRoutes",
  "react",
  "react-router-dom",
]);

const APPROVED_ADAPTER_GRAPH_ROOTS = Object.freeze([
  "src/legacy-preview",
  "src/shared/i18n",
]);

const ADAPTER_GRAPH_EXTENSIONS = Object.freeze([
  ".css",
  ".ts",
  ".tsx",
]);

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

const normalizeText = (value) => String(value ?? "").replaceAll("\\", "/");

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const unwrapExpression = (node) => {
  let current = node;
  while (
    current
    && [
      "JSXExpressionContainer",
      "TSAsExpression",
      "TSSatisfiesExpression",
      "TSNonNullExpression",
      "TypeCastExpression",
    ].includes(current.type)
  ) {
    current = current.expression;
  }
  return current;
};

const staticString = (node) => {
  const current = unwrapExpression(node);
  if (current?.type === "Literal" && typeof current.value === "string") return current.value;
  if (current?.type === "TemplateLiteral" && current.expressions?.length === 0) {
    return current.quasis?.[0]?.value?.cooked ?? current.quasis?.[0]?.value?.raw ?? null;
  }
  return null;
};

const staticObject = (node) => {
  const current = unwrapExpression(node);
  if (current?.type !== "ObjectExpression") return null;
  const result = {};
  for (const property of current.properties ?? []) {
    if (property?.type !== "Property" || property.computed || property.kind !== "init") continue;
    const key = property.key?.type === "Identifier"
      ? property.key.name
      : staticString(property.key);
    if (key === null || key === undefined) continue;
    const value = staticString(property.value);
    if (value !== null) result[key] = value;
  }
  return result;
};

const traverseAst = (root, visit) => {
  const stack = [root];
  const seen = new WeakSet();
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== "object" || seen.has(node)) continue;
    seen.add(node);
    if (typeof node.type === "string") visit(node);
    const children = Object.entries(node)
      .filter(([key]) => key !== "parent" && key !== "scope")
      .flatMap(([, value]) => Array.isArray(value) ? value : [value]);
    for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index]);
  }
};

const parseSource = (source, file, language) => {
  try {
    return { ast: parseAst(source, { lang: language }, file), failures: [] };
  } catch {
    return {
      ast: null,
      failures: [`${file}: source must parse as ${language}`],
    };
  }
};

const topLevelVariableInitializers = (ast) => {
  const initializers = new Map();
  for (const statement of ast.body ?? []) {
    const declaration = statement.type === "ExportNamedDeclaration"
      ? statement.declaration
      : statement;
    if (declaration?.type !== "VariableDeclaration") continue;
    for (const declarator of declaration.declarations ?? []) {
      if (declarator.id?.type !== "Identifier" || declarator.init === null) continue;
      const existing = initializers.get(declarator.id.name) ?? [];
      existing.push(declarator.init);
      initializers.set(declarator.id.name, existing);
    }
  }
  return initializers;
};

const directNamedExportInitializers = (ast, exportName) => {
  const initializers = [];
  for (const statement of ast.body ?? []) {
    if (
      statement.type !== "ExportNamedDeclaration"
      || statement.declaration?.type !== "VariableDeclaration"
    ) continue;
    for (const declarator of statement.declaration.declarations ?? []) {
      if (declarator.id?.type === "Identifier" && declarator.id.name === exportName) {
        initializers.push(declarator.init);
      }
    }
  }
  return initializers;
};

const memberPropertyName = (node) => {
  if (node?.type !== "MemberExpression") return null;
  return node.computed
    ? staticString(node.property)
    : node.property?.type === "Identifier"
      ? node.property.name
      : null;
};

const unwrapFrozenExpression = (node) => {
  const current = unwrapExpression(node);
  if (
    current?.type === "CallExpression"
    && current.arguments?.length === 1
    && current.callee?.type === "MemberExpression"
    && current.callee.object?.type === "Identifier"
    && current.callee.object.name === "Object"
    && memberPropertyName(current.callee) === "freeze"
  ) {
    return unwrapExpression(current.arguments[0]);
  }
  return current;
};

const routesFromNamedArrayExport = (
  source,
  exportName,
  file = REQUIRED_FILES.routes,
) => {
  const { ast, failures } = parseSource(source, file, "ts");
  if (ast === null) return { failures, routes: [] };
  const initializers = directNamedExportInitializers(ast, exportName);
  if (initializers.length !== 1 || initializers[0] === null) {
    return {
      failures: [
        ...failures,
        `${file}: must directly export exactly one ${exportName} array`,
      ],
      routes: [],
    };
  }
  const array = unwrapFrozenExpression(initializers[0]);
  if (array?.type !== "ArrayExpression") {
    return {
      failures: [
        ...failures,
        `${file}: ${exportName} must be initialized from a static array`,
      ],
      routes: [],
    };
  }
  const entries = array.elements.map(staticObject);
  if (
    entries.some((entry) => (
      !isObject(entry)
      || typeof entry.id !== "string"
      || typeof entry.path !== "string"
    ))
  ) {
    return {
      failures: [
        ...failures,
        `${file}: ${exportName} must contain only static id/path route objects`,
      ],
      routes: [],
    };
  }
  return {
    failures,
    routes: entries.map(({ id, path: routePath }) => ({ id, path: routePath })),
  };
};

const ownershipFromNamedArrayExport = (
  source,
  exportName,
  file = REQUIRED_FILES.ownership,
) => {
  const { ast, failures } = parseSource(source, file, "ts");
  if (ast === null) return { failures, ownership: [] };
  const initializers = directNamedExportInitializers(ast, exportName);
  if (initializers.length !== 1 || initializers[0] === null) {
    return {
      failures: [
        ...failures,
        `${file}: must directly export exactly one ${exportName} array`,
      ],
      ownership: [],
    };
  }
  const array = unwrapFrozenExpression(initializers[0]);
  if (array?.type !== "ArrayExpression") {
    return {
      failures: [
        ...failures,
        `${file}: ${exportName} must be initialized from a static array`,
      ],
      ownership: [],
    };
  }
  const entries = array.elements.map(staticObject);
  if (
    entries.some((entry) => (
      !isObject(entry)
      || typeof entry.id !== "string"
      || typeof entry.path !== "string"
      || !["native", "compatibility"].includes(entry.owner)
    ))
  ) {
    return {
      failures: [
        ...failures,
        `${file}: ${exportName} must contain only static id/path/owner objects`,
      ],
      ownership: [],
    };
  }
  return {
    failures,
    ownership: entries.map(({ id, owner, path: routePath }) => ({
      id,
      owner,
      path: routePath,
    })),
  };
};

const sortedRoutes = (routes) => [...routes].sort((left, right) => (
  compareText(left.id, right.id) || compareText(left.path, right.path)
));

const sameRoutes = (left, right) => (
  JSON.stringify(sortedRoutes(left)) === JSON.stringify(sortedRoutes(right))
);

const sortedOwnership = (ownership) => [...ownership].sort((left, right) => (
  compareText(left.id, right.id)
  || compareText(left.path, right.path)
  || compareText(left.owner, right.owner)
));

const sameOwnership = (left, right) => (
  JSON.stringify(sortedOwnership(left)) === JSON.stringify(sortedOwnership(right))
);

const approvedBusinessRouteOwnership = Object.freeze(
  APPROVED_BUSINESS_ROUTES.map(({ id, path: routePath }) => ({
    id,
    owner: APPROVED_NATIVE_BUSINESS_ROUTES.some((route) => route.id === id)
      ? "native"
      : "compatibility",
    path: routePath,
  })),
);

export function validateBusinessRouteOwnershipSource(source) {
  const failures = [];
  const parsed = ownershipFromNamedArrayExport(
    source,
    "BUSINESS_ROUTE_OWNERSHIP",
  );
  failures.push(...parsed.failures);
  if (!sameOwnership(parsed.ownership, approvedBusinessRouteOwnership)) {
    failures.push(
      "BUSINESS_ROUTE_OWNERSHIP must assign Overview, Plan, and Problems to native and the remaining 19 routes to compatibility",
    );
  }
  const ids = parsed.ownership.map(({ id }) => id);
  const paths = parsed.ownership.map(({ path: routePath }) => routePath);
  if (new Set(ids).size !== ids.length) failures.push("business route ownership IDs must be unique");
  if (new Set(paths).size !== paths.length) failures.push("business route ownership paths must be unique");
  return [...new Set(failures)];
}

export function validateUnmigratedRoutesSource(source) {
  const failures = [];
  const {
    failures: parseFailures,
    routes,
  } = routesFromNamedArrayExport(source, "UNMIGRATED_ROUTES");
  failures.push(...parseFailures);
  if (!sameRoutes(routes, APPROVED_UNMIGRATED_ROUTES)) {
    failures.push(
      "UNMIGRATED_ROUTES must be the exact independent 19-route compatibility allowlist",
    );
  }

  if (routes.length !== APPROVED_UNMIGRATED_ROUTES.length) {
    failures.push(
      `unmigrated route count must be ${APPROVED_UNMIGRATED_ROUTES.length}, received ${routes.length}`,
    );
  }
  const ids = routes.map(({ id }) => id);
  const paths = routes.map(({ path: routePath }) => routePath);
  if (new Set(ids).size !== ids.length) failures.push("unmigrated route IDs must be unique");
  if (new Set(paths).size !== paths.length) failures.push("unmigrated route paths must be unique");
  for (const { path: routePath } of routes) {
    if (
      !routePath.startsWith("/")
      || routePath.includes("?")
      || routePath.includes("#")
      || routePath.includes("..")
      || (routePath !== "/" && routePath.endsWith("/"))
    ) {
      failures.push(`unmigrated route path is not canonical: ${routePath}`);
    }
  }

  const origins = [...source.matchAll(/https:\/\/[A-Za-z0-9.-]+/gu)].map(([value]) => value);
  if (
    origins.length !== 1
    || origins[0] !== LEGACY_PREVIEW_ORIGIN
  ) {
    failures.push("legacy route registry must freeze only the exact compatibility origin");
  }
  return [...new Set(failures)];
}

const jsxAttributeName = (attribute) => {
  if (attribute?.type !== "JSXAttribute") return null;
  if (attribute.name?.type === "JSXIdentifier") return attribute.name.name;
  return null;
};

const jsxElementName = (element) => {
  if (element?.name?.type === "JSXIdentifier") return element.name.name;
  return null;
};

const collectStringConstants = (ast) => {
  const constants = new Map();
  traverseAst(ast, (node) => {
    if (node.type !== "VariableDeclarator" || node.id?.type !== "Identifier") return;
    const value = staticString(node.init);
    if (value !== null) constants.set(node.id.name, value);
  });
  return constants;
};

const resolveAttributeString = (attribute, constants) => {
  const direct = staticString(attribute?.value);
  if (direct !== null) return direct;
  const expression = unwrapExpression(attribute?.value);
  if (expression?.type === "Identifier") return constants.get(expression.name) ?? null;
  return null;
};

const moduleSpecifiersFromAst = (ast) => {
  const specifiers = [];
  traverseAst(ast, (node) => {
    if (
      [
        "ExportAllDeclaration",
        "ExportNamedDeclaration",
        "ImportDeclaration",
      ].includes(node.type)
    ) {
      const specifier = staticString(node.source);
      if (specifier !== null) specifiers.push(specifier);
      return;
    }
    if (node.type === "ImportExpression") {
      const specifier = staticString(node.source);
      if (specifier !== null) specifiers.push(specifier);
      else specifiers.push("<dynamic-nonliteral>");
      return;
    }
    if (
      node.type === "CallExpression"
      && node.callee?.type === "Identifier"
      && node.callee.name === "require"
    ) {
      const specifier = staticString(node.arguments?.[0]);
      if (specifier !== null) specifiers.push(specifier);
      else specifiers.push("<require-nonliteral>");
      return;
    }
    if (node.type === "TSExternalModuleReference") {
      const specifier = staticString(node.expression);
      if (specifier !== null) specifiers.push(specifier);
      else specifiers.push("<external-nonliteral>");
    }
  });
  return specifiers;
};

export function validateLegacyAdapterSource(source, routesSource = "") {
  const failures = [];
  const { ast, failures: parseFailures } = parseSource(
    source,
    REQUIRED_FILES.adapter,
    "tsx",
  );
  failures.push(...parseFailures);
  if (ast === null) return failures;

  const constants = new Map([
    ...collectStringConstants(ast),
    ...(parseSource(routesSource, REQUIRED_FILES.routes, "ts").ast
      ? collectStringConstants(parseSource(
        routesSource,
        REQUIRED_FILES.routes,
        "ts",
      ).ast)
      : new Map()),
  ]);
  const iframeElements = [];
  const imports = moduleSpecifiersFromAst(ast);
  traverseAst(ast, (node) => {
    if (
      node.type === "JSXOpeningElement"
      && jsxElementName(node) === "iframe"
    ) {
      iframeElements.push(node);
    }
  });

  if (iframeElements.length !== 1) {
    failures.push(`legacy adapter must declare exactly one iframe, received ${iframeElements.length}`);
  } else {
    const attributes = iframeElements[0].attributes ?? [];
    const byName = new Map(attributes.map((attribute) => [jsxAttributeName(attribute), attribute]));
    const sandbox = resolveAttributeString(byName.get("sandbox"), constants);
    const tokens = sandbox?.trim().split(/\s+/u).filter(Boolean).sort(compareText) ?? [];
    if (JSON.stringify(tokens) !== JSON.stringify(APPROVED_LEGACY_SANDBOX_TOKENS)) {
      failures.push(
        `legacy iframe sandbox must be exactly: ${APPROVED_LEGACY_SANDBOX_TOKENS.join(" ")}`,
      );
    }
    if (!byName.has("data-legacy-preview-frame")) {
      failures.push("legacy iframe must expose data-legacy-preview-frame for runtime isolation checks");
    }
    if (!byName.has("title")) failures.push("legacy iframe must have an accessible title");
    if (byName.has("srcDoc")) failures.push("legacy iframe must not use srcDoc");
    const allowValue = resolveAttributeString(byName.get("allow"), constants);
    if (allowValue !== null && allowValue.trim() !== "") {
      failures.push("legacy iframe Permissions Policy allow attribute must be empty");
    }
  }

  if (!imports.some((specifier) => /(?:^|\/)unmigratedRoutes(?:\.[a-z]+)?$/u.test(specifier))) {
    failures.push("legacy adapter must consume the independent unmigrated route registry");
  }
  const approvedImports = new Set(APPROVED_ADAPTER_IMPORTS);
  const unexpectedImports = imports.filter((specifier) => !approvedImports.has(specifier));
  if (unexpectedImports.length > 0) {
    failures.push(
      `legacy adapter imports outside its exact allowlist: ${[...new Set(unexpectedImports)].join(", ")}`,
    );
  }
  if (new Set(imports).size !== imports.length) {
    failures.push("legacy adapter must not duplicate module imports");
  }
  for (const specifier of imports) {
    const normalized = normalizeText(specifier);
    if (
      /@tanstack\/react-query/u.test(normalized)
      || /(?:^|\/)zustand(?:\/|$)/u.test(normalized)
      || /(?:^|\/)src\/(?:app|components|features|layouts|modules|router|routes|state|stores|ui)(?:\/|$)/u.test(normalized)
      || /(?:^|\.\.\/)+(?:app|components|features|layouts|modules|router|routes|state|stores|ui)(?:\/|$)/u.test(normalized)
    ) {
      failures.push(`legacy adapter imports a forbidden owner: ${specifier}`);
    }
  }
  for (const [label, pattern] of ADAPTER_FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) failures.push(`legacy adapter must not use ${label}`);
  }
  if (!/(?:兼容|compatibility)/iu.test(source)) {
    failures.push("legacy adapter must visibly label the iframe as a compatibility surface");
  }
  if (/(?:allow-popups|allow-top-navigation|allow-downloads)/u.test(source)) {
    failures.push("legacy iframe grants a forbidden sandbox capability");
  }
  return [...new Set(failures)];
}

export function validateRuntimeBoundarySpecSource(source) {
  const failures = [];
  const phase1TagCount = [...source.matchAll(/@phase1-system\b/gu)].length;
  if (![1, PHASE1_SYSTEM_SURFACES.length].includes(phase1TagCount)) {
    failures.push(
      `runtime boundary spec must declare one generated or exactly ${PHASE1_SYSTEM_SURFACES.length} explicit @phase1-system cases`,
    );
  }
  for (const surface of PHASE1_SYSTEM_SURFACES) {
    const count = source.split(surface).length - 1;
    if (count < 1) failures.push(`runtime boundary spec must cover ${surface}`);
  }
  const requiredRuntimeSignals = [
    ["main-frame ownership", /mainFrame\s*\(/u],
    ["request frame observation", /\.frame\s*\(/u],
    ["resource/script observation", /resourceType\s*\(/u],
    ["iframe isolation locator", /data-legacy-preview-frame/u],
    ["same-origin V2 API boundary", /\/api\/v2/u],
    ["locked legacy origin", /legacy-compat\.quantgym-v2-preview\.pages\.dev/u],
  ];
  for (const [label, pattern] of requiredRuntimeSignals) {
    if (!pattern.test(source)) failures.push(`runtime boundary spec lacks ${label}`);
  }
  if (/\b(?:__legacyBootCount|LEGACY_BOOT_COUNT)\b/u.test(source)) {
    failures.push("runtime boundary spec must observe resources instead of trusting a boot marker");
  }
  return failures;
}

const UNRESOLVED_STATIC_VALUE = Symbol("unresolved-static-value");

const evaluateNavigationExpression = (
  node,
  initializers,
  resolving = new Set(),
) => {
  const current = unwrapExpression(node);
  if (current?.type === "Identifier") {
    const values = initializers.get(current.name) ?? [];
    if (values.length !== 1 || resolving.has(current.name)) return UNRESOLVED_STATIC_VALUE;
    const nextResolving = new Set(resolving);
    nextResolving.add(current.name);
    return evaluateNavigationExpression(values[0], initializers, nextResolving);
  }
  if (current?.type === "ArrayExpression") {
    const values = [];
    for (const element of current.elements ?? []) {
      if (element === null) return UNRESOLVED_STATIC_VALUE;
      if (element.type === "SpreadElement") {
        const spread = evaluateNavigationExpression(
          element.argument,
          initializers,
          resolving,
        );
        if (!Array.isArray(spread)) return UNRESOLVED_STATIC_VALUE;
        values.push(...spread);
        continue;
      }
      const value = evaluateNavigationExpression(element, initializers, resolving);
      if (value === UNRESOLVED_STATIC_VALUE) return value;
      values.push(value);
    }
    return values;
  }
  if (current?.type === "ObjectExpression") {
    const value = {};
    for (const property of current.properties ?? []) {
      if (property?.type !== "Property" || property.computed || property.kind !== "init") continue;
      const key = property.key?.type === "Identifier"
        ? property.key.name
        : staticString(property.key);
      if (key === "items") {
        const items = evaluateNavigationExpression(property.value, initializers, resolving);
        if (!Array.isArray(items)) return UNRESOLVED_STATIC_VALUE;
        value.items = items;
      } else if (key === "id" || key === "path") {
        const text = staticString(property.value);
        if (text === null) return UNRESOLVED_STATIC_VALUE;
        value[key] = text;
      }
    }
    return value;
  }
  if (current?.type !== "CallExpression") return UNRESOLVED_STATIC_VALUE;
  if (current.callee?.type === "Identifier" && current.callee.name === "item") {
    const id = staticString(current.arguments?.[0]);
    const routePath = staticString(current.arguments?.[1]);
    return id === null || routePath === null
      ? UNRESOLVED_STATIC_VALUE
      : { id, path: routePath };
  }
  if (current.callee?.type !== "MemberExpression") return UNRESOLVED_STATIC_VALUE;
  const method = memberPropertyName(current.callee);
  if (
    method === "freeze"
    && current.callee.object?.type === "Identifier"
    && current.callee.object.name === "Object"
    && current.arguments?.length === 1
  ) {
    return evaluateNavigationExpression(current.arguments[0], initializers, resolving);
  }
  if (method !== "flatMap" || current.arguments?.length !== 1) {
    return UNRESOLVED_STATIC_VALUE;
  }
  const groups = evaluateNavigationExpression(
    current.callee.object,
    initializers,
    resolving,
  );
  const callback = unwrapExpression(current.arguments[0]);
  const callbackBody = unwrapExpression(callback?.body);
  const parameter = callback?.params?.[0];
  if (
    !Array.isArray(groups)
    || callback?.type !== "ArrowFunctionExpression"
    || parameter?.type !== "Identifier"
    || callbackBody?.type !== "MemberExpression"
    || callbackBody.object?.type !== "Identifier"
    || callbackBody.object.name !== parameter.name
    || memberPropertyName(callbackBody) !== "items"
  ) {
    return UNRESOLVED_STATIC_VALUE;
  }
  const flattened = [];
  for (const group of groups) {
    if (!isObject(group) || !Array.isArray(group.items)) return UNRESOLVED_STATIC_VALUE;
    flattened.push(...group.items);
  }
  return flattened;
};

const itemFactoryPreservesRouteIdentity = (initializers) => {
  const factories = initializers.get("item") ?? [];
  if (factories.length !== 1) return false;
  const factory = unwrapExpression(factories[0]);
  if (
    !["ArrowFunctionExpression", "FunctionExpression"].includes(factory?.type)
    || factory.params?.[0]?.type !== "Identifier"
    || factory.params?.[1]?.type !== "Identifier"
  ) {
    return false;
  }
  const body = unwrapExpression(factory.body);
  if (body?.type !== "ObjectExpression") return false;
  const expectedParameters = new Map([
    ["id", factory.params[0].name],
    ["path", factory.params[1].name],
  ]);
  for (const [propertyName, parameterName] of expectedParameters) {
    const property = (body.properties ?? []).find((candidate) => {
      if (candidate?.type !== "Property" || candidate.computed || candidate.kind !== "init") {
        return false;
      }
      const key = candidate.key?.type === "Identifier"
        ? candidate.key.name
        : staticString(candidate.key);
      return key === propertyName;
    });
    if (property?.value?.type !== "Identifier" || property.value.name !== parameterName) {
      return false;
    }
  }
  return true;
};

const routesFromNavigationExport = (source, file = REQUIRED_FILES.navigation) => {
  const { ast, failures } = parseSource(source, file, "ts");
  if (ast === null) return { failures, routes: [] };
  const initializers = topLevelVariableInitializers(ast);
  if (!itemFactoryPreservesRouteIdentity(initializers)) {
    failures.push(
      `${file}: item helper must preserve its first id and second path arguments`,
    );
  }
  const exportInitializers = directNamedExportInitializers(
    ast,
    "PREVIEW_BUSINESS_ROUTES",
  );
  if (exportInitializers.length !== 1 || exportInitializers[0] === null) {
    return {
      failures: [
        ...failures,
        `${file}: must directly export exactly one PREVIEW_BUSINESS_ROUTES array`,
      ],
      routes: [],
    };
  }
  const evaluated = evaluateNavigationExpression(
    exportInitializers[0],
    initializers,
  );
  if (
    !Array.isArray(evaluated)
    || evaluated.some((route) => (
      !isObject(route)
      || typeof route.id !== "string"
      || typeof route.path !== "string"
    ))
  ) {
    return {
      failures: [
        ...failures,
        `${file}: PREVIEW_BUSINESS_ROUTES must resolve to a static route array`,
      ],
      routes: [],
    };
  }
  return {
    failures,
    routes: evaluated.map(({ id, path: routePath }) => ({ id, path: routePath })),
  };
};

const exactObjectPropertyValue = (node, propertyName) => {
  const current = unwrapExpression(node);
  if (current?.type !== "ObjectExpression") return null;
  const matches = (current.properties ?? []).filter((property) => (
    property?.type === "Property"
    && !property.computed
    && property.kind === "init"
    && (
      (property.key?.type === "Identifier" && property.key.name === propertyName)
      || staticString(property.key) === propertyName
    )
  ));
  return matches.length === 1 ? matches[0].value : null;
};

const objectPatternBinding = (pattern, propertyName) => {
  if (pattern?.type !== "ObjectPattern") return null;
  const matches = (pattern.properties ?? []).filter((property) => (
    property?.type === "Property"
    && !property.computed
    && property.kind === "init"
    && (
      (property.key?.type === "Identifier" && property.key.name === propertyName)
      || staticString(property.key) === propertyName
    )
  ));
  if (matches.length !== 1 || matches[0].value?.type !== "Identifier") return null;
  return matches[0].value.name;
};

const hasExactSimpleObjectPatternProperties = (pattern, expectedNames) => {
  if (
    pattern?.type !== "ObjectPattern"
    || pattern.properties?.length !== expectedNames.length
  ) {
    return false;
  }
  const names = [];
  for (const property of pattern.properties) {
    if (
      property?.type !== "Property"
      || property.computed
      || property.kind !== "init"
      || property.value?.type !== "Identifier"
    ) {
      return false;
    }
    const name = property.key?.type === "Identifier"
      ? property.key.name
      : staticString(property.key);
    if (name === null) return false;
    names.push(name);
  }
  return names.sort(compareText).join("\0")
    === [...expectedNames].sort(compareText).join("\0");
};

const isIdentifierNamed = (node, name) => (
  unwrapExpression(node)?.type === "Identifier"
  && unwrapExpression(node).name === name
);

const hasExactSimpleObjectProperties = (node, expectedNames) => {
  const current = unwrapExpression(node);
  if (
    current?.type !== "ObjectExpression"
    || current.properties?.length !== expectedNames.length
  ) {
    return false;
  }
  const names = [];
  for (const property of current.properties) {
    if (
      property?.type !== "Property"
      || property.computed
      || property.kind !== "init"
    ) {
      return false;
    }
    const name = property.key?.type === "Identifier"
      ? property.key.name
      : staticString(property.key);
    if (name === null) return false;
    names.push(name);
  }
  return names.sort(compareText).join("\0")
    === [...expectedNames].sort(compareText).join("\0");
};

const isExactPathSlice = (node, pathBinding) => {
  const current = unwrapExpression(node);
  return current?.type === "CallExpression"
    && current.arguments?.length === 1
    && unwrapExpression(current.arguments[0])?.type === "Literal"
    && unwrapExpression(current.arguments[0]).value === 1
    && current.callee?.type === "MemberExpression"
    && !current.callee.computed
    && isIdentifierNamed(current.callee.object, pathBinding)
    && memberPropertyName(current.callee) === "slice";
};

const isExactPreviewRouteId = (node, idBinding) => {
  const current = unwrapExpression(node);
  return current?.type === "TemplateLiteral"
    && current.expressions?.length === 1
    && current.quasis?.length === 2
    && (current.quasis[0]?.value?.cooked ?? current.quasis[0]?.value?.raw) === "preview-"
    && (current.quasis[1]?.value?.cooked ?? current.quasis[1]?.value?.raw) === ""
    && isIdentifierNamed(current.expressions[0], idBinding);
};

const uniqueTopLevelConstInitializer = (ast, variableName) => {
  const allDeclarators = [];
  traverseAst(ast, (node) => {
    if (
      node.type === "VariableDeclarator"
      && node.id?.type === "Identifier"
      && node.id.name === variableName
    ) {
      allDeclarators.push(node);
    }
  });
  const topLevelDeclarations = [];
  for (const statement of ast.body ?? []) {
    const declaration = statement.type === "ExportNamedDeclaration"
      ? statement.declaration
      : statement;
    if (declaration?.type !== "VariableDeclaration") continue;
    for (const declarator of declaration.declarations ?? []) {
      if (declarator.id?.type === "Identifier" && declarator.id.name === variableName) {
        topLevelDeclarations.push({ declarator, kind: declaration.kind });
      }
    }
  }
  if (
    allDeclarators.length !== 1
    || topLevelDeclarations.length !== 1
    || topLevelDeclarations[0].kind !== "const"
    || topLevelDeclarations[0].declarator.init === null
  ) {
    return null;
  }
  return topLevelDeclarations[0].declarator.init;
};

const isExactLegacyAdapterLoader = (node) => {
  const current = unwrapExpression(node);
  if (
    current?.type !== "CallExpression"
    || !isIdentifierNamed(current.callee, "lazy")
    || current.arguments?.length !== 1
  ) {
    return false;
  }
  const loader = unwrapExpression(current.arguments[0]);
  const imported = unwrapExpression(loader?.body);
  return loader?.type === "ArrowFunctionExpression"
    && loader.params?.length === 0
    && imported?.type === "ImportExpression"
    && staticString(imported.source) === "../../legacy-preview/LegacyRouteAdapter";
};

const isExactLegacyCompatibilityElement = (node) => {
  const current = unwrapExpression(node);
  if (
    current?.type !== "JSXElement"
    || jsxElementName(current.openingElement) !== "Suspense"
    || jsxElementName(current.closingElement) !== "Suspense"
  ) {
    return false;
  }
  const attributes = current.openingElement.attributes ?? [];
  if (
    attributes.length !== 1
    || jsxAttributeName(attributes[0]) !== "fallback"
    || attributes[0].value === null
  ) {
    return false;
  }
  const meaningfulChildren = (current.children ?? []).filter((child) => (
    child.type !== "JSXText" || child.value.trim() !== ""
  ));
  if (meaningfulChildren.length !== 1) return false;
  const mounted = unwrapExpression(meaningfulChildren[0]);
  return mounted?.type === "CallExpression"
    && isIdentifierNamed(mounted.callee, "createElement")
    && mounted.arguments?.length === 1
    && isIdentifierNamed(mounted.arguments[0], "legacyRouteAdapter");
};

const validateLegacyCompatibilityElement = (routerAst) => {
  const failures = [];
  const adapterInitializer = uniqueTopLevelConstInitializer(
    routerAst,
    "legacyRouteAdapter",
  );
  if (!isExactLegacyAdapterLoader(adapterInitializer)) {
    failures.push(
      "V2 router legacyRouteAdapter must uniquely lazy-load the isolated LegacyRouteAdapter module",
    );
  }
  const elementInitializer = uniqueTopLevelConstInitializer(
    routerAst,
    "legacyCompatibilityElement",
  );
  if (!isExactLegacyCompatibilityElement(elementInitializer)) {
    failures.push(
      "V2 router legacyCompatibilityElement must be one unique Suspense wrapper around createElement(legacyRouteAdapter)",
    );
  }
  return failures;
};

const isExactProblemsPageLoader = (node) => {
  const current = unwrapExpression(node);
  if (
    current?.type !== "CallExpression"
    || !isIdentifierNamed(current.callee, "lazy")
    || current.arguments?.length !== 1
  ) {
    return false;
  }
  const loader = unwrapExpression(current.arguments[0]);
  const imported = unwrapExpression(loader?.body);
  return loader?.type === "ArrowFunctionExpression"
    && loader.params?.length === 0
    && imported?.type === "ImportExpression"
    && staticString(imported.source) === "../../pages/training/ProblemsPage";
};

const isExactNativeProblemsElement = (node) => {
  const current = unwrapExpression(node);
  if (
    current?.type !== "JSXElement"
    || jsxElementName(current.openingElement) !== "Suspense"
    || jsxElementName(current.closingElement) !== "Suspense"
  ) {
    return false;
  }
  const attributes = current.openingElement.attributes ?? [];
  if (
    attributes.length !== 1
    || jsxAttributeName(attributes[0]) !== "fallback"
    || attributes[0].value === null
  ) {
    return false;
  }
  const meaningfulChildren = (current.children ?? []).filter((child) => (
    child.type !== "JSXText" || child.value.trim() !== ""
  ));
  if (meaningfulChildren.length !== 1) return false;
  const mounted = unwrapExpression(meaningfulChildren[0]);
  return mounted?.type === "CallExpression"
    && isIdentifierNamed(mounted.callee, "createElement")
    && mounted.arguments?.length === 1
    && isIdentifierNamed(mounted.arguments[0], "problemsPage");
};

const validateNativeProblemsElement = (routerAst) => {
  const failures = [];
  const pageInitializer = uniqueTopLevelConstInitializer(
    routerAst,
    "problemsPage",
  );
  if (!isExactProblemsPageLoader(pageInitializer)) {
    failures.push(
      "V2 router problemsPage must uniquely lazy-load the native ProblemsPage module",
    );
  }
  const elementInitializer = uniqueTopLevelConstInitializer(
    routerAst,
    "nativeProblemsElement",
  );
  if (!isExactNativeProblemsElement(elementInitializer)) {
    failures.push(
      "V2 router nativeProblemsElement must be one unique Suspense wrapper around createElement(problemsPage)",
    );
  }
  return failures;
};

const validateCompatibilityRouteMapping = (routerAst) => {
  const failures = [
    ...validateLegacyCompatibilityElement(routerAst),
    ...validateNativeProblemsElement(routerAst),
  ];
  const mappingCalls = [];
  const problemsGateways = [];
  traverseAst(routerAst, (node) => {
    if (
      node.type === "CallExpression"
      && node.callee?.type === "MemberExpression"
      && !node.callee.computed
      && node.callee.object?.type === "Identifier"
      && node.callee.object.name === "COMPATIBILITY_BUSINESS_ROUTES"
      && memberPropertyName(node.callee) === "map"
    ) {
      mappingCalls.push(node);
    }
    if (
      node.type === "JSXOpeningElement"
      && jsxElementName(node) === "ProblemsRoute"
    ) {
      problemsGateways.push(node);
    }
  });

  if (mappingCalls.length !== 1) {
    failures.push(
      "V2 router must map all 19 compatibility routes exactly once from the ownership registry",
    );
    return failures;
  }

  const callback = unwrapExpression(mappingCalls[0].arguments?.[0]);
  const idBinding = objectPatternBinding(callback?.params?.[0], "id");
  const pathBinding = objectPatternBinding(callback?.params?.[0], "path");
  const callbackBody = unwrapExpression(callback?.body);
  const mappedId = exactObjectPropertyValue(callbackBody, "id");
  const mappedPath = exactObjectPropertyValue(callbackBody, "path");
  const element = exactObjectPropertyValue(callbackBody, "element");
  if (
    callback?.type !== "ArrowFunctionExpression"
    || callback.params?.length !== 1
    || !hasExactSimpleObjectPatternProperties(callback.params[0], ["id", "path"])
    || idBinding === null
    || pathBinding === null
    || callbackBody?.type !== "ObjectExpression"
    || !hasExactSimpleObjectProperties(callbackBody, ["element", "id", "path"])
    || !isExactPathSlice(mappedPath, pathBinding)
    || !isIdentifierNamed(element, "legacyCompatibilityElement")
  ) {
    failures.push(
      "V2 router compatibility mapping must bind all 19 compatibility routes directly to legacyCompatibilityElement",
    );
  }
  if (idBinding === null || !isExactPreviewRouteId(mappedId, idBinding)) {
    failures.push(
      "V2 router compatibility mapping must derive every route id as preview-${id} from the ownership registry id",
    );
  }
  if (problemsGateways.length !== 0) {
    failures.push(
      "V2 router must not declare the retired ProblemsRoute compatibility gateway",
    );
  }
  return failures;
};

export function validateRouterMappingSources({
  navigationSource,
  ownershipSource,
  routerSource,
  routesSource,
}) {
  const failures = [];
  const navigation = routesFromNavigationExport(navigationSource);
  failures.push(...navigation.failures);
  if (
    navigation.routes.length !== APPROVED_BUSINESS_ROUTES.length
    || !sameRoutes(navigation.routes, APPROVED_BUSINESS_ROUTES)
  ) {
    failures.push("V2 navigation must expose exactly the approved 22 business routes");
  }

  const ownership = ownershipFromNamedArrayExport(
    ownershipSource,
    "BUSINESS_ROUTE_OWNERSHIP",
  );
  failures.push(...ownership.failures);
  if (!sameOwnership(ownership.ownership, approvedBusinessRouteOwnership)) {
    failures.push("business route ownership must remain three native plus 19 compatibility routes");
  }
  if (!sameRoutes(
    ownership.ownership.map(({ id, path: routePath }) => ({ id, path: routePath })),
    navigation.routes,
  )) {
    failures.push("router navigation and business route ownership must cover the same 22 routes");
  }

  const registry = routesFromNamedArrayExport(
    routesSource,
    "UNMIGRATED_ROUTES",
  );
  failures.push(...registry.failures);
  if (
    registry.routes.length !== APPROVED_UNMIGRATED_ROUTES.length
    || !sameRoutes(registry.routes, APPROVED_UNMIGRATED_ROUTES)
  ) {
    failures.push("unmigrated route registry must equal the 19-route compatibility ownership complement");
  }

  const parsedRouter = parseSource(routerSource, REQUIRED_FILES.router, "tsx");
  failures.push(...parsedRouter.failures);
  if (parsedRouter.ast !== null) {
    failures.push(...validateCompatibilityRouteMapping(parsedRouter.ast));
  }
  if (!/path\s*:\s*path\.slice\s*\(\s*1\s*\)/u.test(routerSource)) {
    failures.push("V2 router must preserve every non-root allowlisted pathname");
  }
  if (
    !/\{\s*index\s*:\s*true\s*,\s*element\s*:\s*nativeOverviewElement\s*\}/u
      .test(routerSource)
  ) {
    failures.push("V2 router must map the root Overview route to a native element");
  }
  if (
    !/\{\s*path\s*:\s*["']plan["']\s*,\s*element\s*:\s*nativePlanElement\s*\}/u
      .test(routerSource)
  ) {
    failures.push("V2 router must map /plan to its native Plan element");
  }
  if (
    !/\{\s*path\s*:\s*["']problems["']\s*,\s*element\s*:\s*nativeProblemsElement\s*\}/u
      .test(routerSource)
  ) {
    failures.push("V2 router must map /problems to its native Problems element");
  }
  if (
    /\{\s*index\s*:\s*true\s*,\s*element\s*:\s*legacyCompatibilityElement\s*\}/u
      .test(routerSource)
  ) {
    failures.push("native Overview must not use the compatibility adapter");
  }
  if (
    /\{\s*path\s*:\s*["']plan["']\s*,\s*element\s*:\s*legacyCompatibilityElement\s*\}/u
      .test(routerSource)
  ) {
    failures.push("native Plan must not use the compatibility adapter");
  }
  if (
    /\{\s*path\s*:\s*["']problems["']\s*,\s*element\s*:\s*legacyCompatibilityElement\s*\}/u
      .test(routerSource)
  ) {
    failures.push("native Problems must not use the compatibility adapter");
  }
  if (!/LegacyRouteAdapter|legacy-preview/u.test(routerSource)) {
    failures.push("V2 router must bind compatibility routes to the Preview adapter");
  }
  return failures;
}

export function validateBuildIsolationSources({ buildSource, viteSource }) {
  const failures = [];
  if (!/src\/legacy-preview/u.test(viteSource)) {
    failures.push("Vite source policy must name the isolated legacy-preview root");
  }
  if (!/(?:mode|command|environment|QUANTGYM)[\s\S]{0,160}preview/iu.test(viteSource)) {
    failures.push("Vite source policy must gate legacy-preview modules on Preview mode");
  }
  if (
    !/legacyPreviewAllowed|LEGACY_PREVIEW_ALIAS|legacy-preview|LegacyRouteAdapter/u.test(buildSource)
    || !/legacy-compat\.quantgym-v2-preview\.pages\.dev/u.test(buildSource)
    || !/(?:forbidden|reject|invalid)/iu.test(buildSource)
  ) {
    failures.push("production build validation must reject adapter chunks and the legacy origin");
  }
  return failures;
}

export function validateLegacyPreviewFileSource(relativePath, source) {
  const failures = [];
  const isTestSource = /\.test\.(?:ts|tsx)$/u.test(relativePath);
  if (!isTestSource) {
    for (const [label, pattern] of ADAPTER_FORBIDDEN_PATTERNS) {
      if (pattern.test(source)) {
        failures.push(`src/legacy-preview/${relativePath}: must not use ${label}`);
      }
    }
  }
  if (
    /\.(?:ts|tsx)$/u.test(relativePath)
    && /(?:from\s*|import\s*\()\s*["'][^"']*(?:\.\.\/)+(?:app|components|features|layouts|modules|router|routes|state|stores|ui)(?:\/|["'])/u
      .test(source)
  ) {
    failures.push(`src/legacy-preview/${relativePath}: imports a legacy runtime owner`);
  }
  if (
    relativePath.endsWith(".css")
    && /@import|url\s*\(\s*["']?https?:/iu.test(source)
  ) {
    failures.push(`src/legacy-preview/${relativePath}: CSS must not import external runtime content`);
  }
  return failures;
}

const isAtOrUnderRelativePath = (parent, candidate) => (
  candidate === parent || candidate.startsWith(`${parent}/`)
);

const adapterGraphLanguage = (relativePath) => {
  const extension = path.posix.extname(relativePath);
  if (extension === ".tsx") return "tsx";
  if (extension === ".ts") return "ts";
  return null;
};

const resolveAdapterGraphImport = async (
  root,
  importer,
  specifier,
) => {
  if (specifier.includes("?") || specifier.includes("#")) {
    return { failure: `${importer}: adapter graph import must not contain query or fragment data: ${specifier}` };
  }
  if (!specifier.startsWith(".")) {
    return APPROVED_ADAPTER_IMPORTS.includes(specifier)
      ? { external: true }
      : { failure: `${importer}: adapter graph imports an unapproved package: ${specifier}` };
  }

  const importerDirectory = path.posix.dirname(importer);
  const unresolved = path.posix.normalize(path.posix.join(importerDirectory, specifier));
  if (
    unresolved === ".."
    || unresolved.startsWith("../")
    || path.posix.isAbsolute(unresolved)
  ) {
    return { failure: `${importer}: adapter graph import escapes the repository: ${specifier}` };
  }
  const extension = path.posix.extname(unresolved);
  const candidates = extension
    ? [unresolved]
    : [
        ...ADAPTER_GRAPH_EXTENSIONS.map((candidateExtension) => (
          `${unresolved}${candidateExtension}`
        )),
        ...ADAPTER_GRAPH_EXTENSIONS.map((candidateExtension) => (
          path.posix.join(unresolved, `index${candidateExtension}`)
        )),
      ];
  for (const candidate of candidates) {
    const absolutePath = path.join(root, candidate);
    let stats;
    try {
      stats = await lstat(absolutePath);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    if (stats.isSymbolicLink() || !stats.isFile()) {
      return { failure: `${importer}: adapter graph target must be a regular non-symlink file: ${candidate}` };
    }
    const canonicalPath = await realpath(absolutePath);
    const canonicalRelativePath = normalizeText(path.relative(root, canonicalPath));
    if (
      canonicalRelativePath === ".."
      || canonicalRelativePath.startsWith("../")
      || path.isAbsolute(canonicalRelativePath)
    ) {
      return { failure: `${importer}: adapter graph target resolves outside the repository: ${candidate}` };
    }
    if (!APPROVED_ADAPTER_GRAPH_ROOTS.some((approvedRoot) => (
      isAtOrUnderRelativePath(approvedRoot, canonicalRelativePath)
    ))) {
      return {
        failure: `${importer}: adapter graph reaches an unapproved source owner: ${canonicalRelativePath}`,
      };
    }
    return { relativePath: canonicalRelativePath };
  }
  return { failure: `${importer}: adapter graph import does not resolve: ${specifier}` };
};

export async function validateLegacyAdapterReachableGraph(root) {
  const absoluteRoot = await realpath(path.resolve(root));
  const entry = REQUIRED_FILES.adapter;
  const queue = [entry];
  const visited = new Set();
  const failures = [];
  while (queue.length > 0) {
    const relativePath = queue.shift();
    if (visited.has(relativePath)) continue;
    visited.add(relativePath);
    const absolutePath = path.join(absoluteRoot, relativePath);
    let stats;
    try {
      stats = await lstat(absolutePath);
    } catch (error) {
      if (error?.code === "ENOENT") {
        failures.push(`${relativePath}: adapter graph file is missing`);
        continue;
      }
      throw error;
    }
    if (stats.isSymbolicLink() || !stats.isFile()) {
      failures.push(`${relativePath}: adapter graph files must be regular non-symlink files`);
      continue;
    }
    const source = await readFile(absolutePath, "utf8");
    for (const [label, pattern] of ADAPTER_FORBIDDEN_PATTERNS) {
      if (pattern.test(source)) {
        failures.push(`${relativePath}: adapter reachable graph must not use ${label}`);
      }
    }
    if (relativePath.endsWith(".css")) {
      if (/@import/iu.test(source)) {
        failures.push(`${relativePath}: adapter reachable CSS must not import another stylesheet`);
      }
      continue;
    }
    const language = adapterGraphLanguage(relativePath);
    if (language === null) {
      failures.push(`${relativePath}: adapter graph contains an unsupported source type`);
      continue;
    }
    const parsed = parseSource(source, relativePath, language);
    failures.push(...parsed.failures);
    if (parsed.ast === null) continue;
    for (const specifier of moduleSpecifiersFromAst(parsed.ast)) {
      const resolved = await resolveAdapterGraphImport(
        absoluteRoot,
        relativePath,
        specifier,
      );
      if (resolved.failure) failures.push(resolved.failure);
      else if (resolved.relativePath) queue.push(resolved.relativePath);
    }
  }
  return [...new Set(failures)].sort(compareText);
}

const auditLegacyPreviewDirectory = async (root) => {
  const relativeDirectory = "src/legacy-preview";
  const absoluteDirectory = path.join(root, relativeDirectory);
  let entries;
  try {
    entries = await readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [`${relativeDirectory}: required directory is missing`];
    throw error;
  }
  const failures = [];
  const names = entries.map(({ name }) => name).sort(compareText);
  const productionNames = names.filter((name) => !/\.test\.(?:ts|tsx)$/u.test(name));
  if (
    JSON.stringify(productionNames)
    !== JSON.stringify(EXPECTED_LEGACY_PREVIEW_FILES)
  ) {
    failures.push(
      `${relativeDirectory}: production files must be exactly ${EXPECTED_LEGACY_PREVIEW_FILES.join(", ")}`,
    );
  }
  for (const entry of entries) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(root, relativePath);
    const stats = await lstat(absolutePath);
    if (entry.isSymbolicLink() || stats.isSymbolicLink()) {
      failures.push(`${relativePath}: symlinks are forbidden`);
      continue;
    }
    if (!entry.isFile() || !stats.isFile()) {
      failures.push(`${relativePath}: nested or non-regular paths are forbidden`);
      continue;
    }
    const source = await readFile(absolutePath, "utf8");
    failures.push(...validateLegacyPreviewFileSource(entry.name, source));
  }
  return failures;
};

const isTypeScriptProductionSource = (relativePath) => (
  /\.(?:ts|tsx)$/u.test(relativePath)
  && !/\.test\.(?:ts|tsx)$/u.test(relativePath)
  && !/\/testing\//u.test(relativePath)
);

const walkProductionSources = async (root, relativeDirectory) => {
  const absoluteDirectory = path.join(root, relativeDirectory);
  let entries;
  try {
    entries = await readdir(absoluteDirectory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries.sort((left, right) => compareText(left.name, right.name))) {
    const relativePath = path.posix.join(relativeDirectory, entry.name);
    const absolutePath = path.join(root, relativePath);
    const stats = await lstat(absolutePath);
    if (stats.isSymbolicLink()) {
      files.push({ relativePath, symlink: true });
    } else if (stats.isDirectory()) {
      files.push(...await walkProductionSources(root, relativePath));
    } else if (stats.isFile() && isTypeScriptProductionSource(relativePath)) {
      files.push({ relativePath, symlink: false });
    }
  }
  return files;
};

export async function validateV2SourceApiBoundary(root) {
  const failures = [];
  for (const sourceRoot of PHASE1_PRODUCTION_SOURCE_ROOTS) {
    for (const file of await walkProductionSources(root, sourceRoot)) {
      if (file.symlink) {
        failures.push(`${file.relativePath}: symlinks are not allowed in the V2 source graph`);
        continue;
      }
      const source = await readFile(path.join(root, file.relativePath), "utf8");
      for (const match of source.matchAll(/["'`]([^"'`\r\n]*\/api\/[^"'`\r\n]*)["'`]/gu)) {
        const value = match[1] ?? "";
        if (!value.startsWith("/api/") && !/^https?:\/\//u.test(value)) continue;
        if (/^https?:\/\//u.test(value)) {
          failures.push(`${file.relativePath}: external API literal ${JSON.stringify(value)}`);
          continue;
        }
        const apiPathIndex = value.indexOf("/api/");
        const apiPath = value.slice(apiPathIndex);
        if (!/^\/api\/v2(?:\/|$|\?)/u.test(apiPath)) {
          failures.push(`${file.relativePath}: non-V2 API literal ${JSON.stringify(value)}`);
        }
      }
      for (const pattern of LEGACY_TOP_LEVEL_PATTERNS) {
        if (pattern.test(source)) {
          failures.push(`${file.relativePath}: top-level V2 source contains legacy runtime evidence`);
          break;
        }
      }
    }
  }
  return failures;
}

const secureRead = async (root, relativePath) => {
  const absolutePath = path.join(root, relativePath);
  let stats;
  try {
    stats = await lstat(absolutePath);
  } catch (error) {
    if (error?.code === "ENOENT") return { failure: `${relativePath}: required file is missing` };
    throw error;
  }
  if (stats.isSymbolicLink() || !stats.isFile()) {
    return { failure: `${relativePath}: required path must be a regular non-symlink file` };
  }
  const rootRealPath = await realpath(root);
  const fileRealPath = await realpath(absolutePath);
  const relativeToRoot = path.relative(rootRealPath, fileRealPath);
  if (
    relativeToRoot === ".."
    || relativeToRoot.startsWith(`..${path.sep}`)
    || path.isAbsolute(relativeToRoot)
  ) {
    return { failure: `${relativePath}: required file resolves outside the repository` };
  }
  return { source: await readFile(fileRealPath, "utf8") };
};

export async function findPhase1LegacyBoundaryFailures(root) {
  const absoluteRoot = path.resolve(root);
  const reads = await Promise.all(Object.entries(REQUIRED_FILES).map(async ([key, relativePath]) => (
    [key, relativePath, await secureRead(absoluteRoot, relativePath)]
  )));
  const sources = {};
  const failures = [];
  for (const [key, relativePath, result] of reads) {
    if (result.failure) failures.push(result.failure);
    else sources[key] = result.source;
  }
  if (sources.routes !== undefined) {
    failures.push(...validateUnmigratedRoutesSource(sources.routes));
  }
  if (sources.ownership !== undefined) {
    failures.push(...validateBusinessRouteOwnershipSource(sources.ownership));
  }
  if (sources.adapter !== undefined) {
    failures.push(...validateLegacyAdapterSource(sources.adapter, sources.routes ?? ""));
  }
  if (sources.runtime !== undefined) {
    failures.push(...validateRuntimeBoundarySpecSource(sources.runtime));
  }
  if (
    sources.build !== undefined
    && sources.vite !== undefined
  ) {
    failures.push(...validateBuildIsolationSources({
      buildSource: sources.build,
      viteSource: sources.vite,
    }));
  }
  if (
    sources.navigation !== undefined
    && sources.ownership !== undefined
    && sources.router !== undefined
    && sources.routes !== undefined
  ) {
    failures.push(...validateRouterMappingSources({
      navigationSource: sources.navigation,
      ownershipSource: sources.ownership,
      routerSource: sources.router,
      routesSource: sources.routes,
    }));
  }
  failures.push(...await auditLegacyPreviewDirectory(absoluteRoot));
  failures.push(...await validateLegacyAdapterReachableGraph(absoluteRoot));
  failures.push(...await validateV2SourceApiBoundary(absoluteRoot));
  try {
    const v2Violations = await findBoundaryViolations(absoluteRoot);
    failures.push(...v2Violations.map(({ evidence, file, rule }) => (
      `${file}: existing V2 boundary violation [${rule}] ${evidence}`
    )));
  } catch (error) {
    failures.push(`existing V2 boundary checker failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  return [...new Set(failures)].sort(compareText);
}

const parseRootArgument = (argumentsList) => {
  if (argumentsList.length === 0) {
    return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  }
  if (
    argumentsList.length !== 2
    || argumentsList[0] !== "--root"
    || argumentsList[1].startsWith("--")
  ) {
    throw new Error("usage: check-frontend-upgrade-phase1-legacy-boundary.mjs [--root <path>]");
  }
  return path.resolve(argumentsList[1]);
};

const runCli = async () => {
  const root = parseRootArgument(process.argv.slice(2));
  const failures = await findPhase1LegacyBoundaryFailures(root);
  if (failures.length > 0) {
    failures.forEach((failure) => console.error(`FAIL: ${failure}`));
    process.exitCode = 1;
    return;
  }
  console.log(
    `Frontend upgrade Phase 1 legacy boundary valid: `
    + `${APPROVED_UNMIGRATED_ROUTES.length} compatibility routes, `
    + `${PHASE1_SYSTEM_SURFACES.length} isolated V2 systems.`,
  );
};

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) await runCli();
