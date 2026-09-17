import { Link } from "react-router-dom";
import { useAppStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices } from "../../stores/usePageApi.js";
import "./behavioralInterview.css";

export function BehavioralInterviewPageContent() {
  const appServices = useAppServices();
  const language = useAppStore((state) => state.appPrefs?.language || appServices.getLanguage?.() || "zh");
  const en = language === "en";

  return (
    <section className="behavioral-beta-page" aria-labelledby="behavioral-page-title">
      <header className="behavioral-beta-header">
        <h1 id="behavioral-page-title">Behavioral Interview</h1>
        <span className="behavioral-beta-badge">Beta</span>
      </header>
      <div className="behavioral-beta-content">
        <h2>{en ? "Coming soon" : "准备中"}</h2>
        <p>{en ? "Behavioral interview practice is being prepared and is not available yet." : "行为面试训练正在准备中，暂未开放。"}</p>
        <Link to="/calendar">{en ? "Open training calendar" : "前往训练日历"}<span aria-hidden="true"> →</span></Link>
      </div>
    </section>
  );
}
