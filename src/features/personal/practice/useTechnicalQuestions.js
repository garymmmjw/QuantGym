import { useEffect, useState } from 'react';
import { useAppStore, useAuthStore } from '../../../stores/AppServicesContext.jsx';
import { reportCloudSessionResponse } from '../../../state/cloudSessionStatus.js';

export function useTechnicalQuestions() {
  const user = useAuthStore(state => state.currentUser);
  const config = useAppStore(state => state.cloudConfig || {});
  const enabled = Boolean(user?.id && config.endpoint && config.token && config.userId === user.id);
  const key = JSON.stringify([user?.id, config.endpoint, config.token]);
  const [snapshot, setSnapshot] = useState({ key: '', questions: [], phase: 'loading' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    setSnapshot({ key, questions: [], phase: 'loading' });
    (async () => {
      try {
        const response = await fetch(`${config.endpoint.replace(/\/+$/, '')}/practice/technical/questions`, {
          headers: { Authorization: `Bearer ${config.token}` }, signal: controller.signal, cache: 'no-store',
        });
        reportCloudSessionResponse(config, response.status);
        if (!response.ok) throw new Error('Question library unavailable');
        const data = await response.json();
        if (data.source !== 'question-bank' || !Array.isArray(data.questions)) throw new Error('Invalid question library');
        const questions = data.questions.filter(q => q?.source === 'question-bank' && typeof q.id === 'string'
          && typeof q.title === 'string' && typeof q.prompt === 'string' && q.prompt.trim() && typeof q.reference === 'string');
        if (alive) setSnapshot({ key, questions, phase: 'ready' });
      } catch { if (alive) setSnapshot({ key, questions: [], phase: 'error' }); }
      finally { clearTimeout(timeout); }
    })();
    return () => { alive = false; clearTimeout(timeout); controller.abort(); };
  }, [key, enabled, retry]);
  return { ...(snapshot.key === key && enabled ? snapshot : { questions: [], phase: enabled ? 'loading' : 'local' }),
    reload: () => setRetry(value => value + 1), enabled };
}
