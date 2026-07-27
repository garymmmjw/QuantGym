import type { FormEvent } from "react";

import {
  createPlanRequestSchema,
  type CreatePlanRequest,
} from "../../domains/plan/plan.schema";
import { Button } from "../../design-system/primitives/Button";
import type { AppLanguage } from "../../shared/i18n";
import {
  creatablePlanSeasons,
  isCreatablePlanSeason,
  isPlanRole,
  planCopyFor,
  planRoleLabel,
  planRoleValues,
  planSeasonLabel,
} from "./plan.model";
import styles from "./PlanSetupForm.module.css";

export type PlanSetupFieldErrors = Partial<Readonly<Record<
  keyof CreatePlanRequest,
  string
>>>;

export type PlanSetupFormProps = Readonly<{
  language: AppLanguage;
  onChange: (value: CreatePlanRequest) => void;
  onSubmit: (value: CreatePlanRequest) => void;
  value: CreatePlanRequest;
  disabled?: boolean;
  errors?: PlanSetupFieldErrors;
  isSubmitting?: boolean;
}>;

const weeklyHourOptions = [5, 8, 12, 16] as const;

export function PlanSetupForm({
  disabled = false,
  errors = {},
  isSubmitting = false,
  language,
  onChange,
  onSubmit,
  value,
}: PlanSetupFormProps) {
  const copy = planCopyFor(language);
  const isUnavailable = disabled || isSubmitting;
  const validation = createPlanRequestSchema.safeParse(value);
  const canSubmit = validation.success
    && isPlanRole(validation.data.role)
    && isCreatablePlanSeason(validation.data.season);
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !isUnavailable
      && validation.success
      && isPlanRole(validation.data.role)
      && isCreatablePlanSeason(validation.data.season)
    ) {
      onSubmit(validation.data);
    }
  };

  return (
    <form className={styles.root} onSubmit={handleSubmit}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{copy.createPlan}</p>
        <h2 className={styles.title}>{copy.planSetupTitle}</h2>
        <p className={styles.description}>{copy.planSetupDescription}</p>
      </header>

      <fieldset className={styles.trackFieldset} disabled={isUnavailable}>
        <legend className={styles.legend}>{copy.trackLabel}</legend>
        <div className={styles.trackOptions}>
          {(["internship", "fulltime"] as const).map((track) => (
            <label className={styles.trackOption} key={track}>
              <input
                checked={value.track === track}
                name="plan-track"
                onChange={() => onChange({ ...value, track })}
                type="radio"
                value={track}
              />
              <span>{track === "internship" ? copy.trackInternship : copy.trackFulltime}</span>
            </label>
          ))}
        </div>
        {errors.track === undefined ? null : (
          <p className={styles.error} role="alert">{errors.track}</p>
        )}
      </fieldset>

      <div className={styles.selectGrid}>
        <label className={styles.selectField}>
          <span className={styles.legend}>{copy.roleLabel}</span>
          <select
            aria-invalid={errors.role === undefined ? undefined : true}
            className={styles.select}
            disabled={isUnavailable}
            onChange={(event) => {
              const role = event.currentTarget.value;
              if (isPlanRole(role)) onChange({ ...value, role });
            }}
            required
            value={value.role}
          >
            {planRoleValues.map((role) => (
              <option key={role} value={role}>{planRoleLabel(role, language)}</option>
            ))}
          </select>
          {errors.role === undefined ? null : (
            <span className={styles.error} role="alert">{errors.role}</span>
          )}
        </label>
        <label className={styles.selectField}>
          <span className={styles.legend}>{copy.seasonLabel}</span>
          <select
            aria-invalid={errors.season === undefined ? undefined : true}
            className={styles.select}
            disabled={isUnavailable}
            onChange={(event) => {
              const season = event.currentTarget.value;
              if (isCreatablePlanSeason(season)) onChange({ ...value, season });
            }}
            required
            value={value.season}
          >
            {creatablePlanSeasons.map((season) => (
              <option key={season} value={season}>{planSeasonLabel(season, language)}</option>
            ))}
          </select>
          {errors.season === undefined ? null : (
            <span className={styles.error} role="alert">{errors.season}</span>
          )}
        </label>
      </div>

      <label className={styles.selectField}>
        <span className={styles.legend}>{copy.weeklyHoursLabel}</span>
        <select
          aria-invalid={errors.weeklyHours === undefined ? undefined : true}
          className={styles.select}
          disabled={isUnavailable}
          onChange={(event) => onChange({
            ...value,
            weeklyHours: Number(event.currentTarget.value) as CreatePlanRequest["weeklyHours"],
          })}
          value={value.weeklyHours}
        >
          {weeklyHourOptions.map((hours) => (
            <option key={hours} value={hours}>
              {copy.weeklyHoursOption(hours)}
            </option>
          ))}
        </select>
        {errors.weeklyHours === undefined ? null : (
          <span className={styles.error} role="alert">{errors.weeklyHours}</span>
        )}
      </label>

      <Button
        disabled={disabled || !canSubmit}
        fullWidth
        isLoading={isSubmitting}
        loadingLabel={copy.creatingPlan}
        size="large"
        type="submit"
      >
        {copy.createPlan}
      </Button>
    </form>
  );
}
