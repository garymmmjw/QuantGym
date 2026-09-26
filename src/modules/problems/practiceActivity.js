import { mergeFreePracticeAttempts } from './freePracticeAttempts.js';
import { countsTowardProblemTotal, isTrainerCatalogProblem } from './completion.js';

const list = value => Array.isArray(value) ? value : [];

// Submitted outcomes are explicit work. Merely opening a question or revealing
// an answer cannot create activity. Cloud revisions share their original date.
export function getFreePracticeActivities(state = {}, { now = Date.now() } = {}) {
  const problems = new Map(list(state.problems).map(problem => [problem.id, problem]));
  const byProblem = new Map();
  list(state.problemStates).forEach(record => {
    if (!record?.problemId) return;
    const problem = problems.get(record.problemId) || { id: record.problemId };
    if (!countsTowardProblemTotal(problem) || isTrainerCatalogProblem(problem)) return;
    byProblem.set(record.problemId, mergeFreePracticeAttempts([byProblem.get(record.problemId), record.freePracticeAttempts]));
  });
  return [...byProblem].flatMap(([problemId, attempts]) => {
    const problem = problems.get(problemId);
    return attempts.filter(attempt => Date.parse(attempt.recordedAt) <= new Date(now).getTime()).map(attempt => ({
      id: `free-practice:${problemId}:${attempt.id}`, kind: 'tech', source: 'question-bank', problemId,
      count: 1, completedAt: attempt.recordedAt, outcome: attempt.outcome, elapsedSeconds: attempt.elapsedSeconds,
      title: problem?.titleZh || problem?.titleEn || '', titleEn: problem?.titleEn || '',
      questionNumber: String(problem?.provenance?.originalNumber || ''), countedAsSolved: true,
    }));
  });
}
