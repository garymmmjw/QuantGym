export function SkillTemplate() {
  return (
    <template id="skillTemplate">
          <article className="skill-card">
            <div className="skill-head">
              <span className="skill-icon"></span>
              <div>
                <h3></h3>
                <small></small>
              </div>
            </div>
            <div className="level-row">
              <strong></strong>
              <span></span>
            </div>
            <div className="progress-track">
              <div className="progress-fill"></div>
            </div>
            <div className="subskills"></div>
          </article>
        </template>
  );
}
