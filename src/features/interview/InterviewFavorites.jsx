export function InterviewFavorites({ summary = "", items = [], emptyText = "" }) {
  return (
    <div className="interview-favorites">
      <div className="interview-favorites-head">
        <strong>收藏夹</strong>
        <small id="interviewFavoritesSummary">{summary}</small>
      </div>
      <div id="interviewFavoritesList" className="interview-favorites-list">
        {!items.length ? (
          <small className="interview-favorite-empty">{emptyText}</small>
        ) : (
          items.map((favorite) => (
            <article key={favorite.id || favorite.title} className="interview-favorite-item">
              <strong>{favorite.title}</strong>
              {favorite.meta ? <small>{favorite.meta}</small> : null}
              {favorite.summary ? <p>{favorite.summary}</p> : null}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
