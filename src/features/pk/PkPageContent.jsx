import { usePkPageModel } from "./pkHooks.js";

export function PkPageContent() {
  const model = usePkPageModel();

  return (
    <section className="pk-section">
      <div className="section-heading">
        <h2>PK</h2>
        <button id="startPkBtn" className="secondary-button" type="button" onClick={model.start}>
          <i data-lucide="swords" />
          匹配在线 Quant
        </button>
      </div>
      <div className="pk-grid">
        <div className="pk-arena">
          <div className="pk-scoreboard">
            <div>
              <small>你</small>
              <strong id="pkUserScore">{model.view.userScore}</strong>
            </div>
            <div>
              <small id="pkOpponentName">{model.view.opponentName}</small>
              <strong id="pkOpponentScore">{model.view.opponentScore}</strong>
            </div>
          </div>
          <div id="pkProblem" className="pk-problem">{model.view.problemText}</div>
          <form id="pkForm" className="pk-form" onSubmit={model.submit}>
            <textarea
              id="pkAnswer"
              rows={5}
              placeholder="写下你的解法、推导或交易直觉"
              value={model.view.answer}
              onChange={(event) => model.setAnswer(event.target.value)}
            />
            <div className="form-row">
              <button className="primary-button" type="submit">
                <i data-lucide="send" />
                提交 PK
              </button>
              <button
                id="pkRevealBtn"
                className="icon-button ghost"
                type="button"
                title="查看参考答案"
                aria-label="查看参考答案"
                onClick={model.reveal}
              >
                <i data-lucide="lightbulb" />
              </button>
            </div>
          </form>
        </div>
        <aside id="pkFeed" className="pk-feed">
          {model.view.feed.map((item, index) => (
            <div className="pk-feed-item" key={`${index}-${item.slice(0, 24)}`}>{item}</div>
          ))}
        </aside>
      </div>
    </section>
  );
}
