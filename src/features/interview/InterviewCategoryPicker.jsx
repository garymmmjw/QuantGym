export function InterviewCategoryPicker({ categories = [], onToggle }) {
  return categories.map((item) => (
    <button
      key={item.key}
      type="button"
      className={`interview-category-chip${item.active ? " active" : ""}`}
      data-interview-category={item.key}
      aria-pressed={String(item.active)}
      onClick={() => onToggle?.(item.key)}
    >
      {item.label}
    </button>
  ));
}
