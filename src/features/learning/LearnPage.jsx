import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSyncModuleRoute } from '../../hooks/useSyncModuleRoute.js';
import { useAuthStore } from '../../stores/AppServicesContext.jsx';
import { LearningAccessGate } from './LearningAccessGate.jsx';
import { useLearningSources } from './useLearningSources.js';
import { useLearningState } from './useLearningState.js';
import { lessonQuery, lessonProblem, questionHref } from './learnBridge.mjs';
import { createCloudLearnProgressWriter } from './learnProgressWriter.mjs';
import { learnFrameHeight, learnScrollTarget } from './learnLayout.mjs';
import './learnPage.css';

export function LearnPage() {
  useSyncModuleRoute('learn');
  const userId = useAuthStore(state => state.currentUser?.id || '');
  return <LearningAccessGate title="Learn 课程"><LearnWorkspace key={userId} userId={userId} /></LearningAccessGate>;
}

function LearnWorkspace({ userId }) {
  const { sources, loading, error, refresh } = useLearningSources();
  const learning = useLearningState(sources);
  const cloud = learning.cloud;
  const sessionRef = useRef(null);
  const flushRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [progressConflict, setProgressConflict] = useState(false);
  const location = useLocation(), navigate = useNavigate();
  const [frameSrc, setFrameSrc] = useState(() => `/learn-embed/?${lessonQuery(location.search)}`);
  const [frameVersion, setFrameVersion] = useState(0);
  const [frameHeight, setFrameHeight] = useState(240);
  const pendingFrameScroll = useRef(null);
  const reportedQuery = useRef(lessonQuery(location.search));
  const frame = useRef(null), active = useRef(true);
  const currentUserId = useRef(userId); currentUserId.current = userId;
  const [frameReady, setFrameReady] = useState(false), [bridgeError, setBridgeError] = useState('');
  const progress = learning.learnProgress;
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
    if (!sources || !cloud || !learning.profile) return;
    active.current = true;
    let effectActive = true, session = null, flushSequence = 0, readerPending = false;
    const flushes = new Map();
    const blockedSources = new WeakSet();
    const post = message => frame.current?.contentWindow?.postMessage(message, window.location.origin);
    const flushReader = () => new Promise((resolve, reject) => {
      if (!session?.isCurrent()) { resolve(); return; }
      const requestId = `parent-flush-${++flushSequence}`;
      const timeout = setTimeout(() => { flushes.delete(requestId); reject(new Error('进度尚未确认保存，请保持页面并重试。')); }, 45000);
      flushes.set(requestId, { resolve, reject, timeout });
      post({ type: 'qg-learn-flush', requestId });
    });
    flushRef.current = flushReader;
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
    const onMessage = event => {
      if (!effectActive || !active.current || currentUserId.current !== userId || event.origin !== window.location.origin || event.source !== frame.current?.contentWindow || blockedSources.has(event.source)) return;
      const message = event.data;
      if (!message || typeof message !== 'object') return;
      if (message.type === 'qg-learn-ready') {
        try {
          const stored = cloud.getSnapshot().learnProgress;
          session?.writer.close();
          const reader = { source: event.source };
          const isCurrent = () => effectActive && active.current && currentUserId.current === userId
            && session === reader && reader.source === frame.current?.contentWindow && !blockedSources.has(reader.source);
          reader.isCurrent = isCurrent;
          reader.writer = createCloudLearnProgressWriter({ initialProgress: stored,
            save: (value, baseline) => cloud.saveLearn(value, baseline),
            isActive: isCurrent });
          session = reader; sessionRef.current = reader;
          post({ type: 'qg-learn-init', userId, progress: stored });
          setFrameReady(true);
        } catch (e) { setBridgeError(e.message || '课程记录读取失败。'); }
      } else if (message.type === 'qg-learn-save-status') {
        readerPending = Boolean(message.pending);
        setSaving(readerPending);
        if (message.error) setBridgeError(message.error);
      } else if (message.type === 'qg-learn-flushed' || message.type === 'qg-learn-flush-error') {
        const pending = flushes.get(message.requestId);
        if (!pending) return;
        clearTimeout(pending.timeout); flushes.delete(message.requestId);
        if (message.type === 'qg-learn-flushed') pending.resolve();
        else pending.reject(new Error(message.error || '课程进度尚未保存，请重试。'));
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
            const error = '另一设备已修改同一处课程记录。当前输入保留在此页，云端记录未被覆盖。可先记下当前输入，再载入云端进度。';
            setProgressConflict(true); setBridgeError(error);
            post({ type: 'qg-learn-save-error', requestId: message.requestId, error });
            return;
          }
          setProgressConflict(false); setBridgeError(''); post({ type: 'qg-learn-saved', requestId: message.requestId });
        }).catch(e => {
          if (!reader.isCurrent()) return;
          const error = e.message || '课程进度未保存，请保留页面后重试。';
          setBridgeError(error); post({ type: 'qg-learn-save-error', requestId: message.requestId, error });
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
        if (message.query !== undefined) {
          const query = lessonQuery(message.query);
          pendingFrameScroll.current = { top: 0, behavior: 'instant' };
          reportedQuery.current = query; setFrameReady(false);
          setFrameSrc(`/learn-embed/?${query}`); setFrameVersion(value => value + 1);
          navigate(`/learn?${query}`, { replace: true });
        } else if (message.view === 'readiness') navigate('/readiness');
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
    const beforeUnload = event => { if (readerPending || session?.writer.hasPending()) { event.preventDefault(); event.returnValue = ''; } };
    let navigating = false;
    const followLink = async event => {
      const link = event.target.closest?.('a[href]');
      if (!link || !session?.isCurrent() || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.hash) return;
      event.preventDefault(); event.stopPropagation();
      if (navigating) return;
      navigating = true;
      try { await flushReader(); if (effectActive) navigate(`${url.pathname}${url.search}`); }
      catch (error) { if (effectActive) setBridgeError(error.message); }
      finally { navigating = false; }
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', followLink, true);
    return () => {
      effectActive = false; active.current = false; session?.writer.close(); sessionRef.current = null; flushRef.current = null;
      for (const pending of flushes.values()) { clearTimeout(pending.timeout); pending.reject(new Error('课程页面已切换。')); }
      window.removeEventListener('message', onMessage); window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', followLink, true);
    };
  }, [sources, cloud, Boolean(learning.profile), userId, navigate]);

  const showMap = async () => {
    try { await flushRef.current?.(); }
    catch { setBridgeError('进度尚未保存，请先重试保存后再返回课程地图。'); return; }
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
    <p className="qg-learning-storage-note" role="status">{bridgeError || learning.error ? '同步需要处理，请查看下方提示。' : saving || learning.syncing ? '正在同步账号进度…' : learning.profile ? '云端已同步 · 使用同一账号可在其他设备继续学习' : '正在恢复账号进度…'}</p>
    {(error || learning.error || bridgeError) && <div className="qg-learning-error" role="alert">{error || learning.error || bridgeError}{(error || learning.error) && <button type="button" onClick={() => error ? refresh() : learning.refresh()}>重新加载</button>}{progressConflict && <button type="button" onClick={() => { sessionRef.current?.writer.close(); setSaving(false); setProgressConflict(false); setBridgeError(''); setFrameReady(false); setFrameVersion(value => value + 1); }}>放弃本页未保存修改，载入云端进度</button>}</div>}
    {loading || !sources || !learning.profile ? <div className="qg-learning-loading" role="status">正在恢复账号进度并载入课程…</div> : <div className="qg-learning-embed-shell">
      {!frameReady && <div className="qg-learning-loading" role="status">正在打开课程…</div>}
      <iframe key={frameVersion} ref={frame} className="qg-learning-frame" src={frameSrc} style={{ height: frameHeight }} scrolling="no" title="Learn 课程与交互课件" allow="" />
    </div>}
    <p className="qg-learning-storage-note"><span role="status">{bridgeError ? '请检查上方提示，未确认保存前请保持页面。' : saving ? '正在保存课程进度…' : learning.error ? '云端暂未连接，请重试同步。' : learning.profile ? '账号云端已同步，换浏览器或设备登录可继续学习。' : '正在恢复账号云端进度…'}</span> 课程 XP 计入学习成长；主题能力与准备度由练习结果计算。</p>
  </section>;
}
