import { useNewsPageModel } from "./newsHooks.js";
import { buildNewsStats } from "./newsViewModel.js";
import { NewsFilters } from "./NewsFilters.jsx";
import { NewsForm } from "./NewsForm.jsx";
import { NewsList } from "./NewsList.jsx";
import { NewsDetail } from "./NewsDetail.jsx";
import { useAppServices } from "../../stores/usePageApi.js";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";

export function NewsPageContent() {
  const model = useNewsPageModel();
  const appServices = useAppServices();

  useScopedRefreshIcons(appServices.services?.refreshIcons, ".news-section", [
    model.filteredNews,
    model.detailItem,
    model.showForm,
    model.topicFilter,
    model.sourceFilter
  ]);

  const stats = buildNewsStats(model.allNews, {
    saved: model.t("newsSavedCount"),
    auto: model.t("newsAutoCount"),
    official: model.t("newsOfficialCount"),
    social: model.t("newsSocialCount"),
    read: model.t("newsReadCount")
  });

  const latest = model.allNews[0]?.publishedAt || model.allNews[0]?.createdAt || "";
  const filteredText = model.filteredNews.length === model.allNews.length
    ? ""
    : ` - ${model.t("newsShowing")} ${model.filteredNews.length}`;
  const latestText = latest
    ? `${model.t("newsSavedCount")} ${model.allNews.length} - ${model.t("newsLatest")} ${model.formatNewsDate?.(latest)}${filteredText}`
    : model.t("newsDefaultSubtitle");
  const syncText = model.syncError
    ? ` - ${model.t("newsApiUnavailable")}`
    : model.fetchedAt
      ? ` - API ${model.formatTimeOnly?.(model.fetchedAt)}`
      : "";

  const handleAdd = (item) => {
    model.addFromForm(item);
  };

  return (
    <section className="news-section">
      <div className="section-heading">
        <div>
          <h2>{model.t("newsModuleTitle")}</h2>
          <small id="newsUpdatedAt">{`${latestText}${syncText}`}</small>
        </div>
        <div className="problem-actions">
          <button id="addNewsBtn" className="icon-button ghost" type="button" title={model.t("newsAdd")} aria-label={model.t("newsAdd")} onClick={() => model.setShowForm((v) => !v)}>
            <i data-lucide="file-plus-2" />
          </button>
          <button id="refreshNewsBtn" className="icon-button ghost" type="button" title={model.t("refreshNews")} aria-label={model.t("refreshNews")} onClick={model.refreshNews}>
            <i data-lucide="refresh-cw" />
          </button>
        </div>
      </div>

      <div className="news-intel-board" aria-label={model.t("newsIntelAria")}>
        <div className="news-intel-copy">
          <strong id="newsIntelTitle">{model.t("newsIntelTitle")}</strong>
          <span id="newsIntelSummary">{model.t("newsIntelSummary")}</span>
        </div>
        <div id="newsIntelStats" className="news-intel-stats" aria-live="polite">
          {stats.map((stat) => (
            <span key={stat.label} className="news-intel-stat">
              <strong>{stat.value}</strong>
              <small>{stat.label}</small>
            </span>
          ))}
        </div>
        <NewsFilters
          t={model.t}
          topicFilter={model.topicFilter}
          sourceFilter={model.sourceFilter}
          onTopicChange={model.setTopicFilter}
          onSourceChange={model.setSourceFilter}
        />
        <p id="newsSocialHint" className="news-social-hint">{model.t("newsSocialHint")}</p>
      </div>

      {model.showForm ? (
        <NewsForm
          t={model.t}
          onSubmit={handleAdd}
          onCancel={() => model.setShowForm(false)}
        />
      ) : null}

      {model.detailItem ? (
        <NewsDetail
          t={model.t}
          item={model.detailItem}
          getItemTitle={model.getItemTitle}
          getItemSourceType={model.getItemSourceType}
          getSourceTypeLabel={model.getSourceTypeLabel}
          getVerificationLabel={model.getVerificationLabel}
          formatNewsDate={model.formatNewsDate}
          inferSource={model.inferSource}
          safeExternalUrl={model.safeExternalUrl}
          normalizeSkills={model.normalizeSkills}
          skillDefs={model.skillDefs}
          onBack={model.closeDetail}
        />
      ) : (
        <NewsList
          t={model.t}
          items={model.filteredNews}
          hasAnyItems={model.allNews.length > 0}
          emptyAllLabel={model.t("newsNoItems")}
          emptyFilterLabel={model.t("newsNoFilterItems")}
          getItemTitle={model.getItemTitle}
          getItemSourceType={model.getItemSourceType}
          getSourceTypeLabel={model.getSourceTypeLabel}
          getVerificationLabel={model.getVerificationLabel}
          formatNewsDate={model.formatNewsDate}
          inferSource={model.inferSource}
          safeExternalUrl={model.safeExternalUrl}
          normalizeSkills={model.normalizeSkills}
          skillDefs={model.skillDefs}
          onOpen={model.openDetail}
        />
      )}
    </section>
  );
}
