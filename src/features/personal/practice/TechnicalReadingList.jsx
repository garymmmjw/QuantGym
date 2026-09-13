export function TechnicalSourceCredit({ metadata }) {
  if (!metadata) return null;
  return <p className="practice-source-credit"><a href={metadata.sourceUrl} target="_blank" rel="noreferrer">{metadata.title} ↗</a>
    <span>{metadata.author} · {metadata.edition}</span></p>;
}

export function TechnicalReadingList({ groups, language = 'zh' }) {
  const en = language === 'en';
  const count = groups.reduce((total, group) => total + group.questions.length, 0);
  if (!count) return null;
  return <details className="practice-catalog practice-reading-list">
    <summary><span>{en ? 'Appendix B · LeetCode reading list' : '附录 B · LeetCode 推荐清单'}<small>{en ? count + ' source recommendations · open a problem on LeetCode' : count + ' 道原书推荐题 · 点击前往力扣练习'}</small></span><span className="practice-reading-toggle" aria-hidden="true" /></summary>
    <div className="practice-reading-content">{groups.map(group => <section key={group.id}>
      <h3>{group.label}</h3><ol>{group.questions.map(question => <li key={question.frontendId}><a href={question.url} target="_blank" rel="noreferrer"
        aria-label={(en ? 'Open LeetCode' : '打开力扣') + ' ' + question.frontendId + '. ' + question.titleZh}>
        <span className="practice-reading-number">{question.frontendId}.</span><span>{question.titleZh}</span><span aria-hidden="true">↗</span></a></li>)}</ol>
    </section>)}</div>
  </details>;
}
