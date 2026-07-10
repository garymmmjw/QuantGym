/* ============================================================
   QuantGym 全局共享状态 · qg-state.js
   单一数据源：XP / 连胜 / 段位 / 已解题 / 今日任务 / 计划看板
   事件总线：qg-state（状态变化）、qg-nav(跨模块跳转)
   反馈层：Toast、升级庆祝弹窗（vanilla DOM，任何模块可用）
   在每个 DC 的 <helmet> 里 <script src="./qg-state.js"></script>
   ============================================================ */
(function () {
  if (window.QG) return;

  var KEY = 'qg-shared-v1';
  var TODAY = (function () { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
  var DAY_IDX = (new Date().getDay() + 6) % 7; // 一=0 … 日=6

  /* ---------- 任务定义（今日任务 ↔ 计划看板 ↔ 模块） ---------- */
  var QUESTS = [
    { id: 'daily-problem', icon: 'check',    title: '完成每日一题',                sub: '概率 · 中等难度', xp: 20, plan: 'prob',  page: 'problems' },
    { id: 'mental-90',     icon: 'calc',     title: 'Mental Math 达到 90% 正确率', sub: '限时挑战',       xp: 30, plan: 'mm',    page: 'mental' },
    { id: 'review-cards',  icon: 'notebook', title: '复习 3 张资料卡',             sub: '间隔记忆',       xp: 15, plan: null,    page: 'notes' },
    { id: 'poker-session', icon: 'suit',     title: '完成一手扑克决策复盘',        sub: '决策直觉',       xp: 25, plan: 'poker', page: 'poker' },
    { id: 'read-exp',      icon: 'news',     title: '读一篇市场面经',              sub: 'Quant Wire',     xp: 10, plan: 'notes', page: 'exp' },
  ];

  var TIERS = ['Intern', 'Analyst I', 'Analyst II', 'Analyst III', 'Associate', 'Trader I', 'Trader II', 'Portfolio Mgr'];
  var LVL_XP = 400; // 每级 400 XP，每 3 级一个段位

  var DEFAULTS = {
    day: TODAY,
    xp: 2480, todayXp: 120, streak: 12, solved: 342,
    gems: 480, freezeCards: 0, lastActive: TODAY,
    notifs: [
      { id: 'seed-jobs', img: 'assets/reward-target.webp', title: '求职进度 · Optiver 量化实习进入二面', sub: 'HR 已发出二面邀请，速算轮别忘了热身', t: Date.now() - 2 * 3600e3, read: false, page: 'jobs' },
      { id: 'seed-forum', img: 'assets/avatar-happy-v2.png', title: 'Mina 回复了你的帖子', sub: '「醉酒乘客最优雅的证明」新增 3 条讨论', t: Date.now() - 26 * 3600e3, read: true, page: 'forum' },
    ],
    weekXp: [40, 120, 90, 0, 70, 200, 130],
    quests: { 'daily-problem': true, 'mental-90': true }, // 今日已完成（演示种子）
    bonusGiven: false,
    plan: {},        // 计划看板状态覆盖 {taskId: 'todo'|'doing'|'done'}
    owned: {},       // 奖励商店已兑换 {itemId: true}
    solvedIds: {},   // 题目页手动标记 {problemId: true}
    readIds: {},     // 面经已读 {postId: true}
  };

  function load() {
    var s;
    try { var raw = localStorage.getItem(KEY); s = raw ? JSON.parse(raw) : null; } catch (e) { s = null; }
    if (!s || typeof s !== 'object') s = {};
    var out = {};
    for (var k in DEFAULTS) out[k] = (k in s) ? s[k] : (Array.isArray(DEFAULTS[k]) ? DEFAULTS[k].slice() : (typeof DEFAULTS[k] === 'object' && DEFAULTS[k] !== null ? Object.assign({}, DEFAULTS[k]) : DEFAULTS[k]));
    if (out.day !== TODAY) { // 新的一天：清空今日进度 + 结算连胜/冻结卡
      var missed = 0;
      try { missed = Math.max(0, Math.round((new Date(TODAY) - new Date(out.lastActive || out.day)) / 86400000) - 1); } catch (e) { missed = 0; }
      if (missed > 0) {
        var fc = out.freezeCards || 0;
        if (fc >= missed) { out.freezeCards = fc - missed; out._freezeUsed = missed; }
        else { out._streakLost = out.streak; out.streak = 0; out.freezeCards = 0; }
      }
      out.day = TODAY; out.todayXp = 0; out.quests = {}; out.bonusGiven = false;
      out.weekXp = out.weekXp.slice(); out.weekXp[DAY_IDX] = 0;
    }
    return out;
  }

  var state = load();
  save();
  if (state._freezeUsed) {
    pushNotif({ img: 'assets/reward-fire.webp', title: '连胜冻结卡生效 · 抵挡了 ' + state._freezeUsed + ' 天', sub: '连胜 ' + state.streak + ' 天保住了 · 剩余 ' + (state.freezeCards || 0) + ' 张', page: 'arena' });
    toast('连胜冻结卡生效', { img: 'assets/reward-fire.webp', sub: '抵挡 ' + state._freezeUsed + ' 天断签 · 连胜 ' + state.streak + ' 天保住了', ms: 4800 });
  } else if (state._streakLost) {
    pushNotif({ img: 'assets/mascot-oops.png', title: '连胜中断了', sub: '之前 ' + state._streakLost + ' 天 · 商店的冻结卡可防断签', page: 'arena' });
    toast('连胜中断了', { img: 'assets/mascot-oops.png', sub: '从今天重新出发 · 冻结卡可自动防断签', ms: 4800 });
  }

  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  function emit() { try { window.dispatchEvent(new CustomEvent('qg-state', { detail: snapshot() })); } catch (e) {} }
  function snapshot() { return JSON.parse(JSON.stringify(state)); }

  function levelInfo(xp) {
    var lv = Math.floor(xp / LVL_XP) + 1;
    var into = xp - (lv - 1) * LVL_XP;
    var tierIdx = Math.min(TIERS.length - 1, Math.floor((lv - 1) / 3));
    var tierStart = (tierIdx * 3) * LVL_XP;
    var tierEnd = ((tierIdx + 1) * 3) * LVL_XP;
    return {
      lv: lv, into: into, need: LVL_XP - into, pct: Math.round((into / LVL_XP) * 100),
      tier: TIERS[tierIdx], nextTier: TIERS[Math.min(TIERS.length - 1, tierIdx + 1)],
      tierNeed: tierEnd - xp, tierPct: Math.round(((xp - tierStart) / (tierEnd - tierStart)) * 100),
    };
  }

  /* ---------- Toast / 升级弹窗（vanilla 覆盖层） ---------- */
  var css = document.createElement('style');
  css.textContent =
    '@keyframes qgToastIn{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}' +
    '@keyframes qgToastOut{to{opacity:0;transform:translateY(8px) scale(.97)}}' +
    '@keyframes qgPopIn{from{opacity:0;transform:scale(.82)}60%{transform:scale(1.04)}to{opacity:1;transform:scale(1)}}' +
    '@keyframes qgFadeIn{from{opacity:0}to{opacity:1}}' +
    '@keyframes qgConfetti{from{transform:translateY(-30px) rotate(0deg);opacity:1}to{transform:translateY(300px) rotate(540deg);opacity:0}}' +
    '@keyframes qgMascotHop{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}' +
    '@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;transition-duration:.01ms !important}}';
  (document.head || document.documentElement).appendChild(css);

  var toastBox = null;
  function ensureToastBox() {
    if (toastBox && document.body.contains(toastBox)) return toastBox;
    toastBox = document.createElement('div');
    toastBox.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:99990;display:flex;flex-direction:column;gap:10px;align-items:flex-end;pointer-events:none;font-family:\'Plus Jakarta Sans\',\'PingFang SC\',\'Microsoft YaHei\',sans-serif';
    document.body.appendChild(toastBox);
    return toastBox;
  }

  function toast(msg, opts) {
    opts = opts || {};
    if (!document.body) { document.addEventListener('DOMContentLoaded', function () { toast(msg, opts); }); return; }
    var box = ensureToastBox();
    var el = document.createElement('div');
    el.style.cssText = 'pointer-events:auto;display:flex;align-items:center;gap:10px;max-width:320px;padding:11px 16px 11px 11px;border-radius:16px;background:#221f44;color:#fff;border:1px solid #3a3670;box-shadow:0 18px 40px -14px rgba(10,8,40,.55);animation:qgToastIn .28s cubic-bezier(.2,.8,.2,1) both;cursor:pointer';
    var img = '';
    if (opts.img) img = '<img src="' + opts.img + '" alt="" style="width:34px;height:34px;object-fit:contain;flex:0 0 auto">';
    else img = '<div style="display:grid;place-items:center;width:34px;height:34px;border-radius:11px;background:' + (opts.tone === 'gold' ? 'linear-gradient(135deg,#ff9f2e,#ffbf5e)' : 'linear-gradient(135deg,#5b5ff5,#7d6cff)') + ';flex:0 0 auto;font-size:16px">' + (opts.emoji || '✓') + '</div>';
    el.innerHTML = img +
      '<div style="min-width:0"><div style="font-size:13px;font-weight:800;line-height:1.35">' + msg + '</div>' +
      (opts.sub ? '<div style="font-size:11.5px;font-weight:600;color:#b9b8e0;margin-top:1px">' + opts.sub + '</div>' : '') + '</div>' +
      (opts.xp ? '<div style="flex:0 0 auto;margin-left:4px;padding:4px 10px;border-radius:20px;background:rgba(255,159,46,.18);color:#ffbf5e;font-weight:800;font-size:12px;font-family:\'Space Grotesk\',monospace">+' + opts.xp + ' XP</div>' : '');
    el.onclick = function () { kill(); };
    box.appendChild(el);
    var killed = false;
    function kill() { if (killed) return; killed = true; el.style.animation = 'qgToastOut .22s ease both'; setTimeout(function () { el.remove(); }, 240); }
    setTimeout(kill, opts.ms || 3400);
  }

  function celebrate(opts) { // 升级 / 全部任务达成 庆祝弹窗
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:99991;display:grid;place-items:center;background:rgba(16,14,36,.62);backdrop-filter:blur(4px);animation:qgFadeIn .2s ease both;font-family:\'Plus Jakarta Sans\',\'PingFang SC\',\'Microsoft YaHei\',sans-serif';
    var colors = ['#5b5ff5', '#ff9f2e', '#2ec38a', '#ff7a3d', '#8a7bff', '#ffd479'];
    var confetti = '';
    for (var i = 0; i < 18; i++) {
      confetti += '<span style="position:absolute;top:' + (-10 - Math.random() * 40) + 'px;left:' + (6 + Math.random() * 88) + '%;width:' + (6 + Math.random() * 6) + 'px;height:' + (10 + Math.random() * 8) + 'px;border-radius:3px;background:' + colors[i % colors.length] + ';animation:qgConfetti ' + (1.6 + Math.random() * 1.4) + 's ' + (Math.random() * .8) + 's cubic-bezier(.2,.6,.4,1) infinite"></span>';
    }
    wrap.innerHTML =
      '<div style="position:relative;overflow:hidden;width:min(92vw,380px);border-radius:28px;background:linear-gradient(160deg,#2a2856,#1b1a38);border:1px solid #443f7d;box-shadow:0 40px 90px -30px rgba(0,0,0,.8);padding:34px 28px 26px;text-align:center;color:#fff;animation:qgPopIn .45s cubic-bezier(.2,.8,.2,1) both">' +
      confetti +
      '<img src="' + (opts.img || 'assets/mascot-levelup.png') + '" alt="" style="position:relative;width:150px;height:auto;margin:0 auto;display:block;filter:drop-shadow(0 20px 30px rgba(0,0,0,.5));animation:qgMascotHop 2.4s ease-in-out infinite">' +
      '<div style="position:relative;margin-top:14px;font-size:12px;font-weight:800;letter-spacing:.14em;color:#ffbf5e">' + (opts.kicker || 'LEVEL UP') + '</div>' +
      '<div style="position:relative;margin-top:6px;font-size:26px;font-weight:800;letter-spacing:-.01em">' + (opts.title || '升级了！') + '</div>' +
      '<div style="position:relative;margin-top:7px;font-size:13.5px;line-height:1.6;color:#b9b8e0;font-weight:600">' + (opts.sub || '') + '</div>' +
      '<button type="button" style="position:relative;margin-top:20px;padding:13px 26px;border:none;border-radius:15px;background:linear-gradient(180deg,#6d70f8,#5b5ff5);color:#fff;font-family:inherit;font-weight:800;font-size:14.5px;cursor:pointer;box-shadow:0 4px 0 #3f39c9,0 14px 26px -10px rgba(91,95,245,.7)">' + (opts.cta || '继续训练') + '</button>' +
      '</div>';
    function close() { wrap.style.opacity = '0'; wrap.style.transition = 'opacity .2s ease'; setTimeout(function () { wrap.remove(); }, 220); }
    wrap.addEventListener('click', function (e) { if (e.target === wrap || e.target.tagName === 'BUTTON') close(); });
    document.body.appendChild(wrap);
  }

  /* ---------- 通知流 ---------- */
  function pushNotif(n) {
    n = Object.assign({ t: Date.now(), read: false }, n);
    state.notifs = [n].concat(state.notifs || []).slice(0, 30);
    save(); emit();
  }

  function markNotifsRead() {
    var dirty = false;
    state.notifs = (state.notifs || []).map(function (n) { if (!n.read) dirty = true; return n.read ? n : Object.assign({}, n, { read: true }); });
    if (dirty) { save(); emit(); }
  }

  /* ---------- 核心动作 ---------- */
  function award(n, label, opts) {
    opts = opts || {};
    if (!n) return;
    var before = levelInfo(state.xp);
    var firstToday = state.todayXp === 0;
    state.xp += n; state.todayXp += n;
    state.gems = (state.gems || 0) + Math.max(1, Math.round(n / 2));
    state.weekXp = state.weekXp.slice(); state.weekXp[DAY_IDX] = (state.weekXp[DAY_IDX] || 0) + n;
    state.lastActive = TODAY;
    if (firstToday) {
      state.streak += 1;
      toast('连胜 +1 · 已连续 ' + state.streak + ' 天', { img: 'assets/mascot-fire-v2.png', sub: '保持节奏，别断签', ms: 4200 });
      pushNotif({ img: 'assets/mascot-fire-v2.png', title: '连胜 +1 · 已连续 ' + state.streak + ' 天', sub: '今日首次训练', page: 'plan' });
    }
    var after = levelInfo(state.xp);
    save(); emit();
    if (!opts.silent) toast(label || '训练完成', { xp: n, sub: opts.sub });
    if (after.lv > before.lv) {
      pushNotif({ img: 'assets/mascot-levelup.png', title: '升级到 Lv.' + after.lv + ' · ' + after.tier, sub: '距下一级还差 ' + after.need + ' XP', page: 'skills' });
      setTimeout(function () {
        celebrate({ kicker: 'LEVEL UP', title: '升级到 Lv.' + after.lv, sub: '段位 ' + after.tier + ' · 距下一级还差 ' + after.need + ' XP', img: 'assets/mascot-levelup.png' });
      }, 650);
    }
  }

  function questById(id) { for (var i = 0; i < QUESTS.length; i++) if (QUESTS[i].id === id) return QUESTS[i]; return null; }

  function completeQuest(id, opts) {
    opts = opts || {};
    var q = questById(id);
    if (!q || state.quests[id]) return false;
    state.quests = Object.assign({}, state.quests); state.quests[id] = true;
    if (q.plan) { state.plan = Object.assign({}, state.plan); state.plan[q.plan] = 'done'; }
    save();
    award(q.xp, '任务完成 · ' + q.title, { sub: opts.sub || '已同步到总览与计划看板' });
    pushNotif({ emoji: '✓', title: '任务完成 · ' + q.title, sub: '+' + q.xp + ' XP', page: 'overview' });
    var allDone = QUESTS.every(function (qq) { return state.quests[qq.id]; });
    if (allDone && !state.bonusGiven) {
      state.bonusGiven = true; save();
      setTimeout(function () {
        award(50, '今日目标全部达成', { silent: true });
        pushNotif({ img: 'assets/mascot-trophy-v2.png', title: '今日 5 项任务全部完成', sub: '连胜奖励 +50 XP 已入账', page: 'overview' });
        celebrate({ kicker: 'DAILY GOAL CLEAR', title: '今日 5 项任务全部完成', sub: '连胜奖励 +50 XP · 明天见，别断签！', img: 'assets/mascot-fire-v2.png', cta: '收下奖励' });
      }, 900);
    }
    return true;
  }

  function uncompleteQuest(id) {
    var q = questById(id);
    if (!q || !state.quests[id]) return;
    state.quests = Object.assign({}, state.quests); delete state.quests[id];
    state.xp = Math.max(0, state.xp - q.xp); state.todayXp = Math.max(0, state.todayXp - q.xp);
    state.weekXp = state.weekXp.slice(); state.weekXp[DAY_IDX] = Math.max(0, (state.weekXp[DAY_IDX] || 0) - q.xp);
    if (q.plan) { state.plan = Object.assign({}, state.plan); state.plan[q.plan] = 'doing'; }
    save(); emit();
  }

  function setPlan(taskId, status) {
    state.plan = Object.assign({}, state.plan); state.plan[taskId] = status;
    save(); emit();
  }

  function markSolved(problemId, xp) {
    if (state.solvedIds[problemId]) return false;
    state.solvedIds = Object.assign({}, state.solvedIds); state.solvedIds[problemId] = true;
    state.solved += 1;
    save();
    award(xp || 20, '题目已解决', { sub: '已解题 +1 · 共 ' + state.solved + ' 题' });
    completeQuest('daily-problem', { sub: '每日一题达成' });
    return true;
  }

  function spend(itemId, cost, label, img) {
    var isFreeze = itemId === 'freeze';
    if (!isFreeze && state.owned[itemId]) { toast('已拥有这件奖励', { ms: 1800 }); return false; }
    if ((state.gems || 0) < cost) { toast('训练币不够', { sub: '还差 ' + (cost - (state.gems || 0)) + ' 币 · 完成训练可获得', tone: 'gold', emoji: '!', ms: 2600 }); return false; }
    state.gems -= cost;
    if (isFreeze) state.freezeCards = (state.freezeCards || 0) + 1;
    else { state.owned = Object.assign({}, state.owned); state.owned[itemId] = true; }
    save(); emit();
    toast('兑换成功 · ' + label, { sub: isFreeze ? ('已备 ' + state.freezeCards + ' 张 · 断签自动生效') : ('剩余 ' + state.gems + ' 训练币'), img: img, ms: 3200 });
    pushNotif({ img: img, title: '兑换成功 · ' + label, sub: '剩余 ' + state.gems + ' 训练币', page: 'arena' });
    return true;
  }

  function markRead(postId) {
    if (state.readIds[postId]) return false;
    state.readIds = Object.assign({}, state.readIds); state.readIds[postId] = true;
    save(); emit();
    completeQuest('read-exp');
    return true;
  }

  /* ---------- 跨模块导航总线 ---------- */
  function navigate(page, ctx) {
    try { sessionStorage.setItem('qg-nav-ctx', JSON.stringify({ page: page, ctx: ctx || null, ts: Date.now() })); } catch (e) {}
    window.__qgNavCtx = { page: page, ctx: ctx || null, ts: Date.now() };
    var ev = new CustomEvent('qg-nav', { detail: { page: page, ctx: ctx || null, handled: false } });
    window.dispatchEvent(ev);
    if (!ev.detail.handled) { // 单独打开模块时：跳到总览壳
      try { window.location.href = './QuantGym 总览.dc.html#' + page; } catch (e) {}
    }
  }

  function takeCtx(page) { // 目标模块挂载时取走上下文
    var c = window.__qgNavCtx;
    if (!c) { try { var raw = sessionStorage.getItem('qg-nav-ctx'); c = raw ? JSON.parse(raw) : null; } catch (e) { c = null; } }
    if (!c || c.page !== page) return null;
    if (Date.now() - (c.ts || 0) > 60000) return null;
    window.__qgNavCtx = null;
    try { sessionStorage.removeItem('qg-nav-ctx'); } catch (e) {}
    return c.ctx;
  }

  /* ---------- 对外 API ---------- */
  window.QG = {
    QUESTS: QUESTS,
    get: snapshot,
    set: function (patch) { Object.assign(state, patch); save(); emit(); },
    level: function (xp) { return levelInfo(xp == null ? state.xp : xp); },
    award: award,
    completeQuest: completeQuest,
    uncompleteQuest: uncompleteQuest,
    setPlan: setPlan,
    markSolved: markSolved,
    spend: spend,
    isOwned: function (id) { return !!state.owned[id]; },
    isSolved: function (id) { return !!state.solvedIds[id]; },
    markRead: markRead,
    markNotifsRead: markNotifsRead,
    pushNotif: pushNotif,
    isRead: function (id) { return !!state.readIds[id]; },
    navigate: navigate,
    takeCtx: takeCtx,
    toast: toast,
    celebrate: celebrate,
    dayIdx: DAY_IDX,
    onChange: function (fn) {
      var h = function (e) { fn(e.detail); };
      window.addEventListener('qg-state', h);
      return function () { window.removeEventListener('qg-state', h); };
    },
  };

  // 跨标签页同步
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { state = load(); emit(); }
  });
})();
