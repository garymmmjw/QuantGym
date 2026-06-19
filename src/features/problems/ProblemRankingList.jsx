import { EmptyState } from "../../components/common/EmptyState.jsx";
import { getProblemPopularityScore } from "../../modules/problems/ranking.js";

export function ProblemRankingList({ items = [], emptyText, t, onOpen }) {
  if (!items.length) {
    return emptyText ? <EmptyState title={emptyText} /> : null;
  }

  return items.map((item, index) => {
    const popularity = getProblemPopularityScore(item.social);
    return (
      <button
        key={item.id}
        type="button"
        className="problem-ranking-row"
        data-problem-ranking-row={item.id}
        data-problem-ranking-score={popularity}
        onClick={() => onOpen(item.id)}
      >
        <strong className="problem-ranking-position">{String(index + 1).padStart(2, "0")}</strong>
        <span className="problem-ranking-copy">
          <strong>{item.title}</strong>
          <small>{item.meta}</small>
        </span>
        <span className="problem-ranking-stats">
          <strong>{popularity}</strong>
          <small>{t("popularity")}</small>
          <span><i data-lucide="heart" /> {item.social.likeCount}</span>
          <span><i data-lucide="message-square" /> {item.social.commentCount}</span>
        </span>
      </button>
    );
  });
}
