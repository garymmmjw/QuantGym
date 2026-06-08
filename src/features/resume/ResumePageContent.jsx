import { useEffect, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";

export function ResumePageContent() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const t = appServices.t;
  const userState = useUserStateStore((state) => state.value || {});
  const api = pageApi.resume;
  void userState.resume;
  const [text, setText] = useState(() => api.getResume().text || "");
  const [review, setReview] = useState(() => api.getResume().review || []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pageApi.refreshIcons?.();
    api.renderAccountResumeMeta?.();
  });

  const save = () => {
    api.saveText(text);
    setText(api.getResume().text || "");
  };

  const runReview = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const items = await api.review(text);
      setReview(items || []);
      api.setResume({ ...api.getResume(), review: items || [] });
      pageApi.saveState?.();
    } finally {
      setBusy(false);
      pageApi.refreshIcons?.();
    }
  };

  return (
    <section className="resume-section">
      <div className="section-heading">
        <div>
          <h2>{t("resumeModule") || "简历模块"}</h2>
          <small id="resumeSummary">{t("resumeSummary")}</small>
        </div>
      </div>
      <div className="resume-grid">
        <form id="resumeForm" className="resume-panel" onSubmit={runReview}>
          <label>
            {t("resumeContent") || "简历内容"}
            <textarea
              id="resumeText"
              rows={14}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("resumePlaceholder")}
            />
          </label>
          <div className="form-row">
            <button className="primary-button" id="reviewResumeBtn" type="submit" disabled={busy}>
              <i data-lucide="wand-sparkles" />
              {busy ? t("resumeReviewing") : t("reviewResume") || "LLM 修改简历"}
            </button>
            <button className="secondary-button" id="saveResumeBtn" type="button" onClick={save}>
              <i data-lucide="save" />
              {t("saveResume") || "保存简历"}
            </button>
          </div>
        </form>
        <aside className="resume-panel">
          <h3>{t("resumeReviewTitle") || "修改要点"}</h3>
          <div id="resumeReview" className="resume-review">
            {!review.length ? (
              <p className="muted-empty">{api.getEmptyReviewLabel?.()}</p>
            ) : (
              <ul>{review.map((item, index) => <li key={index}>{item}</li>)}</ul>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
