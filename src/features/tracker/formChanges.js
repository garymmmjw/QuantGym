// A form may stay open while cloud updates arrive. Only fields the person
// actually changed belong to this save; untouched values keep the latest data.
export function changedFormFields(original, values) {
  return Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== original[key]));
}

export function stageFormChanges(original, values, latest) {
  const changes = changedFormFields(original, values);
  // Imported stages may have no date. Confirming their form supplies the date
  // shown in the required input, unless another device has already supplied it.
  if (!latest.recordedDate) changes.recordedDate = values.recordedDate;
  return changes;
}

export function deadlineFormChanges(original, values) {
  const changes = changedFormFields(original, values);
  if (Object.hasOwn(changes, 'dueDate') && !changes.dueDate) changes.dueTime = '';
  return changes;
}
