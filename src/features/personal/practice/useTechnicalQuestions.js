import { useEffect, useState } from 'react';
import { useAppStore, useAuthStore } from '../../../stores/AppServicesContext.jsx';
import { reportCloudSessionResponse } from '../../../state/cloudSessionStatus.js';
import { createPracticeSession } from './practiceModel.js';
import { normalizeTechnicalSupplements } from './technicalQuestionModel.js';

const emptySource = { questions: [], readingList: [], sourceMetadata: null };

export function useTechnicalQuestions() {
  const user = useAuthStore(state => state.currentUser);
  const config = useAppStore(state => state.cloudConfig || {});
  const enabled = Boolean(user?.id && config.endpoint && config.token && config.userId === user.id);
  const key = JSON.stringify([user?.id, config.endpoint, config.token]);
  const [snapshot, setSnapshot] = useState({ key: '', ...emptySource, phase: 'loading' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    setSnapshot({ key, ...emptySource, phase: 'loading' });
    (async () => {
      try {
        const response = await fetch(`${config.endpoint.replace(/\/+$/, '')}/practice/technical/questions`, {
          headers: { Authorization: `Bearer ${config.token}` }, signal: controller.signal, cache: 'no-store',
        });
        reportCloudSessionResponse(config, response.status);
        if (!response.ok) throw new Error('Question library unavailable');
        const data = await response.json();
        if (data.source !== 'question-bank' || !Array.isArray(data.questions)) throw new Error('Invalid question library');
        const questions = data.questions.filter(question => {
          try {
            createPracticeSession('tech', question, { id: 'source-validation', now: '2000-01-01T00:00:00.000Z' });
            return true;
          } catch { return false; }
        });
        if (alive) setSnapshot({ key, questions, ...normalizeTechnicalSupplements(data), phase: 'ready' });
      } catch { if (alive) setSnapshot({ key, ...emptySource, phase: 'error' }); }
      finally { clearTimeout(timeout); }
    })();
    return () => { alive = false; clearTimeout(timeout); controller.abort(); };
  }, [key, enabled, retry]);
  return { ...(snapshot.key === key && enabled ? snapshot : { ...emptySource, phase: enabled ? 'loading' : 'local' }),
    reload: () => setRetry(value => value + 1), enabled };
}
