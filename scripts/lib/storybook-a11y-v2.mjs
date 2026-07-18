export const EXPECTED_STORY_IDS = Object.freeze([
  "design-system-primitives-alert--dark",
  "design-system-primitives-alert--dismissible",
  "design-system-primitives-alert--error",
  "design-system-primitives-alert--light",
  "design-system-primitives-alert--reduced-motion",
  "design-system-primitives-alert--success",
  "design-system-primitives-alert--warning",
  "design-system-primitives-button--active",
  "design-system-primitives-button--dark",
  "design-system-primitives-button--disabled",
  "design-system-primitives-button--focus",
  "design-system-primitives-button--light",
  "design-system-primitives-button--loading",
  "design-system-primitives-button--reduced-motion",
  "design-system-primitives-button--variants",
  "design-system-primitives-skeleton--circle",
  "design-system-primitives-skeleton--dark",
  "design-system-primitives-skeleton--light",
  "design-system-primitives-skeleton--reduced-motion",
  "design-system-primitives-skeleton--text-lines",
  "design-system-primitives-spinner--dark",
  "design-system-primitives-spinner--light",
  "design-system-primitives-spinner--reduced-motion",
  "design-system-primitives-spinner--sizes",
  "design-system-primitives-tabs--active",
  "design-system-primitives-tabs--dark",
  "design-system-primitives-tabs--focus",
  "design-system-primitives-tabs--light",
  "design-system-primitives-tabs--reduced-motion",
  "design-system-primitives-tabs--vertical",
  "design-system-primitives-tabs--with-disabled-tab",
  "design-system-primitives-textfield--dark",
  "design-system-primitives-textfield--disabled",
  "design-system-primitives-textfield--error",
  "design-system-primitives-textfield--focus",
  "design-system-primitives-textfield--light",
  "design-system-primitives-textfield--reduced-motion",
  "design-system-primitives-textfield--required",
  "patterns-emptystate--copy-only",
  "patterns-emptystate--empty",
  "patterns-emptystate--error",
  "patterns-quantyimage--decorative",
  "patterns-quantyimage--ready",
  "primitives-dialog--ready",
  "primitives-drawer--ready",
]);

export const compareStoryIds = (actualIds) => {
  const actual = [...actualIds].sort();
  const actualSet = new Set(actual);
  const expectedSet = new Set(EXPECTED_STORY_IDS);
  const duplicates = actual.filter((id, index) => actual.indexOf(id) !== index);
  return {
    duplicates: [...new Set(duplicates)],
    missing: EXPECTED_STORY_IDS.filter((id) => !actualSet.has(id)),
    unexpected: actual.filter((id) => !expectedSet.has(id)),
  };
};

export const isCompleteStorySet = (difference) => (
  difference.duplicates.length === 0
  && difference.missing.length === 0
  && difference.unexpected.length === 0
);

export const isStoryRenderReady = ({
  bodyClassNames,
  documentTitle,
  expectedStoryId,
  rootChildCount,
  visibleModalCount,
}) => (
  String(bodyClassNames).split(/\s+/).includes("sb-show-main")
  && documentTitle === expectedStoryId
  && (rootChildCount > 0 || visibleModalCount > 0)
);
