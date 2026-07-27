import { lazy, Suspense, type ReactElement } from "react";
import { useLocation } from "react-router-dom";

import { Spinner } from "../../design-system/primitives/Spinner";
import { parseProblemTrainingRoute } from "../../domains/problems/problems.routes";

const ProblemTrainingHandoffPage = lazy(
  () => import("../../pages/training/ProblemTrainingHandoffPage"),
);

type ProblemsRouteProps = Readonly<{
  compatibilityElement: ReactElement;
}>;

export function ProblemsRoute({ compatibilityElement }: ProblemsRouteProps) {
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  const isTrainingHandoff = search.has("problem") || search.has("session");
  if (!isTrainingHandoff) return compatibilityElement;
  return (
    <Suspense fallback={<Spinner label="正在载入训练题目" size="large" />}>
      <ProblemTrainingHandoffPage
        handoff={parseProblemTrainingRoute(search)}
      />
    </Suspense>
  );
}

export default ProblemsRoute;
