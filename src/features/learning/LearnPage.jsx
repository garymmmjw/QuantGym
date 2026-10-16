import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSyncModuleRoute } from '../../hooks/useSyncModuleRoute.js';
import { useAuthStore } from '../../stores/AppServicesContext.jsx';
import { LearningAccessGate } from './LearningAccessGate.jsx';
import { useLearningSources } from './useLearningSources.js';
import { readLearnProgress, saveLearnProgress, LEARNING_CHANGED_EVENT } from './learningStore.mjs';
import { lessonQuery, lessonProblem, questionHref } from './learnBridge.mjs';
import { createLearnProgressWriter } from './learnProgressWriter.mjs';
import { learnFrameHeight, learnScrollTarget } from './learnLayout.mjs';
import './learnPage.css';

export function LearnPage() {
  useSyncModuleRoute('learn');
  const userId = useAuthStore(state => state.currentUser?.id || '');
  return <LearningAccessGate title="Learn 课程"><LearnWorkspace key={userId} userId={userId} /></LearningAccessGate>;
}

function LearnWorkspace({ userId }) {
  const { sources, loading, error, refresh } = useLearningSources();
  const location = useLocation(), navigate = useNavigate();
  const [frameSrc, setFrameSrc] = useState(() => `/learn-embed/?${lessonQuery(location.search)}`);
  const [frameVersion, setFrameVersion] = useState(0);
  const [frameHeight, setFrameHeight] = useState(240);
  const pendingFrameScroll = useRef(null);
  const reportedQuery = useRef(lessonQuery(location.search));
  const frame = useRef(null), active = useRef(true);
  const currentUserId = useRef(userId); currentUserId.current = userId;
  const [frameReady, setFrameReady] = useState(false), [bridgeError, setBridgeError] = useState('');
  const [progress, setProgress] = useState(() => {
    try { return readLearnProgress(userId); } catch { return null; }
  });
  const lessonIds = sources?.library?.lessons?.map(lesson => lesson.id) || [];
  const currentLecture = new URLSearchParams(location.search).get('lecture');
  const currentLesson = sources?.library?.lessons?.find(lesson => lesson.id === currentLecture);
  const currentTopic = sources?.library?.tracks?.flatMap(track => track.topics)?.find(topic => topic.id === currentLesson?.topic_id);

  useEffect(() => {
    const query = lessonQuery(location.search);
    if (query === reportedQuery.current) return;
    reportedQuery.current = query;
    pendingFrameScroll.current = { top: 0, behavior: 'instant' };
    setFrameReady(false); setFrameSrc(`/learn-embed/?${query}`);
    setFrameVersion(value => value + 1);
  }, [location.search]);

  useEffect(() => {
    if (!sources) return;
    active.current = true;
    let effectActive = true, session = null;
    const blockedSources = new WeakSet();
    const ids = sources.library.lessons.map(lesson => lesson.id);
    const post = message => frame.current?.contentWindow?.postMessage(message, window.location.origin);
    const scrollPage = request => window.requestAnimationFrame(() => {
      if (!effectActive || !active.current || !frame.current) return;
      const pinnedInset = (selector, edge) => {
        const element = document.querySelector(selector);
        if (!element) return 0;
        const rect = element.getBoundingClientRect(), position = getComputedStyle(element).position;
        if (!rect.height || !['fixed', 'sticky'].includes(position)) return 0;
        return edge === 'top' ? Math.max(0, rect.bottom) : Math.max(0, window.innerHeight - rect.top);
      };
      const top = learnScrollTarget({ frameTop: frame.current.getBoundingClientRect().top,
        pageY: window.scrollY, viewportHeight: window.innerHeight,
        topInset: pinnedInset('.qg-command-bar', 'top'), bottomInset: pinnedInset('.qg-mobile-tabbar', 'bottom') }, request);
      if (top !== null) window.scrollTo({ top, behavior: request.behavior === 'smooth' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' });
    });
    const sync = event => {
      if (event?.detail?.userId && event.detail.userId !== userId) return;
      try { setProgress(readLearnProgress(userId, { lessonIds: ids })); }
      catch (e) { setBridgeError(e.message || '课程记录读取失败，原记录仍保留。'); }
    };
    const onMessage = event => {
      if (!effectActive || !active.current || currentUserId.current !== userId || event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || blockedSources.has(event.source)) return;
      const message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.type === 'qg-learn-ready') {
        try {
          const stored = readLearnProgress(userId, { lessonIds: ids });
          session?.writer.close();
          const reader = { source: event.source };
          const isCurrent = () => effectActive && active.current && currentUserId.current === userId
            && session === reader && reader.source === frame.current?.contentWindow && !blockedSources.has(reader.source);
          reader.isCurrent = isCurrent;
          reader.writer = createLearnProgressWriter({ userId, initialProgress: stored,
            read: () => readLearnProgress(userId, { lessonIds: ids }),
            save: value => saveLearnProgress(userId, value, { lessonIds: ids }),
            locks: window.navigator.locks, isActive: isCurrent });
          session = reader;
          setProgress(stored);
          post({ type: 'qg-learn-init', userId, progress: stored });
          setFrameReady(true);
        } catch (e) { setBridgeError(e.message || '课程记录读取失败。'); }
      } else if (message.type === 'qg-learn-request') {
        const resources = { library: sources.library, practice: sources.practice };
        const allowed = message.resource === 'problem' || Object.hasOwn(resources, message.resource);
        post({ type: 'qg-learn-response', requestId: message.requestId,
          ...(allowed ? { payload: message.resource === 'problem' ? lessonProblem(sources.records, message.rawId) : resources[message.resource] }
            : { error: '无法读取该课程资源。' }) });
      } else if (message.type === 'qg-learn-progress') {
        const reader = session;
        if (!reader?.isCurrent()) return;
        reader.writer.submit(message.progress).then(result => {
          if (!reader.isCurrent() || result.status === 'inactive') return;
          if (result.status === 'conflict') {
            blockedSources.add(reader.source);
            reader.writer.close();
            setProgress(result.progress);
            setBridgeError('另一窗口已更新课程进度。本页的旧记录没有覆盖它，正在重新载入最新进度；请重试刚才的操作。');
            const query = lessonQuery(window.location.search);
            reportedQuery.current = query;
            setFrameReady(false); setFrameSrc(`/learn-embed/?${query}`);
            setFrameVersion(value => value + 1);
            return;
          }
          setProgress(result.progress); setBridgeError(''); post({ type: 'qg-learn-saved' });
        }).catch(e => {
          if (!reader.isCurrent()) return;
          const error = e.message || '课程进度未保存，请保留页面后重试。';
          setBridgeError(error); post({ type: 'qg-learn-save-error', error });
        });
      } else if (message.type === 'qg-learn-layout') {
        const height = learnFrameHeight(message.height);
        if (height === null) return;
        setFrameHeight(height);
        if (pendingFrameScroll.current) {
          scrollPage(pendingFrameScroll.current); pendingFrameScroll.current = null;
        }
      } else if (message.type === 'qg-learn-scroll') {
        scrollPage(message);
      } else if (message.type === 'qg-learn-route') {
        const query = lessonQuery(message.query);
        if (query !== reportedQuery.current) pendingFrameScroll.current = { top: 0, behavior: 'instant' };
        reportedQuery.current = query;
        navigate(`/learn${query ? `?${query}` : ''}`, { replace: true, preventScrollReset: true });
      } else if (message.type === 'qg-learn-navigate') {
        if (message.view === 'readiness') navigate('/readiness');
        else {
          const query = new URLSearchParams(window.location.search);
          const requestedLesson = message.lessonId || query.get('lecture') || '';
          const lesson = sources.library.lessons.find(item => item.id === requestedLesson || `lesson-${item.id}` === requestedLesson);
          const href = questionHref(sources.records, message.displayId, lesson?.id || '');
          if (href) navigate(href);
          else setBridgeError('这道关联题还没有下载，已保留原题号，不会跳转到其他题。');
        }
      }
    };
    sync();
    window.addEventListener('message', onMessage);
    window.addEventListener(LEARNING_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { effectActive = false; active.current = false; session?.writer.close(); window.removeEventListener('message', onMessage); window.removeEventListener(LEARNING_CHANGED_EVENT, sync); window.removeEventListener('storage', sync); };
  }, [sources, userId, navigate]);

  const showMap = () => {
    const query = `track=${currentLesson?.track_id || 'quant'}`;
    reportedQuery.current = query;
    pendingFrameScroll.current = { top: 0, behavior: 'instant' };
    setFrameReady(false); setFrameSrc(`/learn-embed/?${query}`); setFrameVersion(value => value + 1);
    navigate(`/learn?${query}`, { replace: true });
  };
  return <section className="qg-learning-page">
    <header className="qg-learning-header"><div><p className="qg-learning-eyebrow">LEARN · 翁家宝典</p><h1>{currentLesson ? currentLesson.title : '学懂，再练会。'}</h1><p>{currentLesson ? `${currentTopic?.title || currentLesson.topic_id} · 完成课程后可进入关联练习` : '从量化基础到金融市场，跟随课程学习，用题目检验理解。'}</p></div>
      <div className="qg-learning-actions">{currentLesson && <button onClick={showMap}>课程地图</button>}<Link to="/readiness">能力与 Offer Bar →</Link><Link to="/problems?bank=quantvault">翁家宝典</Link></div></header>
    <div className="qg-learning-stats"><span><strong>{lessonIds.length || 99}</strong> 节课程</span><span><strong>{progress?.completed?.length || 0}</strong> 已完成</span><span><strong>{progress?.xp || 0}</strong> 课程 XP</span><span><strong>{sources?.records?.length || 860}</strong> 道可练习题</span></div>
    {(error || bridgeError) && <div className="qg-learning-error" role="alert">{error || bridgeError}{error && <button type="button" onClick={refresh}>重新加载</button>}</div>}
    {loading || !sources ? <div className="qg-learning-loading" role="status">正在载入课程与关联练习…</div> : <div className="qg-learning-embed-shell">
      {!frameReady && <div className="qg-learning-loading" role="status">正在打开课程…</div>}
      <iframe key={frameVersion} ref={frame} className="qg-learning-frame" src={frameSrc} style={{ height: frameHeight }} scrolling="no" title="Learn 课程与交互课件" allow="" />
    </div>}
    <p className="qg-learning-storage-note">进度按当前账号保存在此浏览器。课程 XP 计入学习成长；主题能力与准备度由练习结果计算。</p>
  </section>;
}
