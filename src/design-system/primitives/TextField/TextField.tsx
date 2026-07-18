import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import styles from "./TextField.module.css";

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  readonly containerClassName?: string;
  readonly error?: ReactNode;
  readonly hint?: ReactNode;
  readonly label: ReactNode;
  readonly leadingAdornment?: ReactNode;
  readonly trailingAdornment?: ReactNode;
  readonly visuallyHideLabel?: boolean;
};

const hasRenderableContent = (value: ReactNode) =>
  value !== undefined && value !== null && value !== false && value !== "";

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  {
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    className,
    containerClassName,
    disabled = false,
    error,
    hint,
    id,
    label,
    leadingAdornment,
    required = false,
    trailingAdornment,
    visuallyHideLabel = false,
    ...inputProps
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? `qg-field-${generatedId}`;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const hasHint = hasRenderableContent(hint);
  const hasError = hasRenderableContent(error);
  const describedBy = [
    ariaDescribedBy,
    hasHint ? hintId : undefined,
    hasError ? errorId : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");
  const inputClasses = [styles.input, className]
    .filter((value): value is string => Boolean(value))
    .join(" ");
  const containerClasses = [styles.root, containerClassName]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return (
    <div className={containerClasses} data-disabled={disabled || undefined} data-error={hasError || undefined}>
      <label
        className={visuallyHideLabel ? styles.visuallyHidden : styles.label}
        htmlFor={inputId}
      >
        {label}
        {required ? (
          <span aria-hidden="true" className={styles.requiredMark}>
            *
          </span>
        ) : null}
      </label>
      <div className={styles.control}>
        {hasRenderableContent(leadingAdornment) ? (
          <span className={styles.adornment}>{leadingAdornment}</span>
        ) : null}
        <input
          {...inputProps}
          ref={ref}
          aria-describedby={describedBy || undefined}
          aria-invalid={ariaInvalid ?? (hasError || undefined)}
          className={inputClasses}
          disabled={disabled}
          id={inputId}
          required={required}
        />
        {hasRenderableContent(trailingAdornment) ? (
          <span className={styles.adornment}>{trailingAdornment}</span>
        ) : null}
      </div>
      {hasHint ? (
        <div className={styles.hint} id={hintId}>
          {hint}
        </div>
      ) : null}
      {hasError ? (
        <div className={styles.error} id={errorId} role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
});
