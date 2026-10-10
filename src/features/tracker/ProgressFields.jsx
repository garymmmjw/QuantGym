import React from 'react';
import { getEventMeta, INTERVIEW_ROUNDS, isInterviewType, PROGRESS_TYPES, STATUS_META } from './dataModel.js';

export default function ProgressFields({ idPrefix, values, onChange, isSubmission = false, includeOffer = false }) {
  const types = isSubmission ? ['submitted'] : [...PROGRESS_TYPES.filter(type => type !== 'custom'), ...(includeOffer ? ['offer'] : []), 'custom'];
  return <>
    <label className="qt-td-field" htmlFor={`${idPrefix}-type`}>
      <span>进展</span>
      <select id={`${idPrefix}-type`} disabled={isSubmission} autoFocus={!isSubmission} value={values.type} onChange={event => onChange({
        type: event.target.value,
        interviewRound: isInterviewType(event.target.value) ? values.interviewRound || '1st' : '',
        customLabel: event.target.value === 'custom' ? values.customLabel || '' : '',
      })}>
        {types.map(type => <option key={type} value={type}>{type === 'custom' ? '自定义…' : getEventMeta({ type, interviewRound: values.interviewRound }).label}</option>)}
      </select>
    </label>
    {isInterviewType(values.type) && <label className="qt-td-field" htmlFor={`${idPrefix}-round`}>
      <span>面试轮次</span>
      <select id={`${idPrefix}-round`} value={values.interviewRound || '1st'} onChange={event => onChange({ interviewRound: event.target.value })}>
        {INTERVIEW_ROUNDS.map(round => <option key={round} value={round}>{round}</option>)}
      </select>
    </label>}
    {values.type === 'custom' && <label className="qt-td-field" htmlFor={`${idPrefix}-custom`}>
      <span>{STATUS_META.custom.label}进展 <span className="qt-td-required">*</span></span>
      <input id={`${idPrefix}-custom`} type="text" required maxLength={80} value={values.customLabel || ''}
        placeholder="填写进展，例如 Phone Screen"
        onChange={event => onChange({ customLabel: event.target.value })} />
    </label>}
  </>;
}
