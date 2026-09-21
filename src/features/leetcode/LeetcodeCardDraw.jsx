import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, RotateCcw, Shuffle } from "lucide-react";
import { drawReviewProblem, problemUrl } from "./leetcodeModel.js";
import { drawReviewCards, getReviewCardHistory } from "./leetcodeCardDrawModel.js";
import "./leetcodeCardDraw.css";

// Keep the visual timeline and the one selection callback on the same clock.
const DRAW_DURATION = 1560;
const REVEAL_AT = 1320;
const DEAL_DURATION = 540;

const MASCOT = "/assets/generated/playful-precision/mascot-card-dealer-v1.png";

function CardBack() {
  return <span className="lc-card-back" aria-hidden="true"><span className="lc-card-corner">Q</span><span className="lc-card-emblem">Q<span>GYM</span></span><span className="lc-card-corner is-bottom">Q</span></span>;
}

export function LeetcodeCardDraw({ pool, selectedProblem, lc, practiceSessions, now, busy, headingRef, onSelect, onDrawingChange, autoDraw = false }) {
  const en = lc.language === "en";
  const t = (zh, english) => en ? english : zh;
  const currentOptions = { now, submissions: lc.data.submissions, practiceSessions, connection: lc.data.connection };
  const opening = useRef({ pool: [...pool], options: currentOptions });
  const drawPool = autoDraw ? opening.current.pool : pool;
  const options = autoDraw ? opening.current.options : currentOptions;
  const latest = useRef(null);
  latest.current = { options, onSelect, onDrawingChange, pool: drawPool, selectedProblem };
  const poolKey = autoDraw ? "single-draw" : pool.map(problem => problem.slug).join("|");
  const [hand, setHand] = useState(() => drawReviewCards(drawPool, options));
  const [hovered, setHovered] = useState(null);
  const [draw, setDraw] = useState(null);
  const [deal, setDeal] = useState(0);
  const [revealed, setRevealed] = useState(null);
  const autoStarted = useRef(false);
  const timers = useRef([]);
  const animating = useRef(false);
  const finishActive = useRef(null);
  const touch = useRef(null);
  const cards = useRef([]);
  const journey = useRef(null);
  const controls = useRef(null);
  const problem = draw?.problem || (autoDraw ? revealed : selectedProblem);
  const drawing = Boolean(draw && draw.phase !== "settled");
  const concealed = Boolean(draw && ["preparing", "drawing"].includes(draw.phase));
  const history = useMemo(() => problem ? getReviewCardHistory(problem, options) : null,
    [problem, options.now, options.submissions, options.practiceSessions, options.connection]);
  const disabled = autoDraw || busy || drawing;
  const labels = en ? { 1: "Easy", 2: "Medium", 3: "Hard" } : { 1: "简单", 2: "中等", 3: "困难" };

  function cancelAnimation() {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    animating.current = false;
    finishActive.current = null;
    latest.current.onDrawingChange(false);
  }

  useEffect(() => {
    cancelAnimation();
    setDraw(null); setHovered(null);
    setHand(drawReviewCards(latest.current.pool, { ...latest.current.options, previousSlug: latest.current.selectedProblem?.slug }));
    return cancelAnimation;
  }, [poolKey]);
  useEffect(() => { if (busy && !autoDraw) { cancelAnimation(); setDraw(null); } }, [busy, autoDraw]);
  useEffect(() => {
    if (!autoDraw) return undefined;
    // Scheduling after mount also avoids double selection during StrictMode's
    // setup/cleanup replay. The opening pool remains stable while saving.
    const timer = window.setTimeout(() => {
      if (autoStarted.current) return;
      autoStarted.current = true;
      choose(drawReviewProblem(opening.current.pool, "", Math.random, opening.current.options));
    }, DEAL_DURATION);
    return () => window.clearTimeout(timer);
  }, [autoDraw]);

  function dealAgain() {
    if (disabled || animating.current) return;
    setHovered(null);
    setDraw(null);
    setHand(drawReviewCards(pool, { ...options, previousSlug: selectedProblem?.slug }));
    setDeal(value => value + 1);
  }

  function choose(problem, index = Math.floor(hand.length / 2)) {
    if (!problem || (!autoDraw && disabled) || animating.current) return;
    setHovered(null);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(problem);
      setDraw({ phase: "settled", index, problem });
      latest.current.onSelect(problem);
      if (!autoDraw) setHand(drawReviewCards(drawPool, { ...options, previousSlug: problem.slug }));
      return;
    }
    const source = cards.current[index];
    const bounds = source?.getBoundingClientRect();
    animating.current = true;
    onDrawingChange(true);
    setDraw({ phase: "preparing", index, problem, source: bounds ? {
      x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2,
      width: source.offsetWidth, height: source.offsetHeight,
      angle: (index - (hand.length - 1) / 2) * 10,
    } : null });
  }

  useLayoutEffect(() => {
    if (draw?.phase !== "preparing") return;
    // Measure the final portrait at its real content height before paint. The
    // same element travels from the fan, flips and remains as the result.
    const bounds = journey.current.getBoundingClientRect();
    const source = draw.source;
    const flight = {
      "--draw-duration": `${DRAW_DURATION}ms`,
      "--source-x": `${source ? source.x - bounds.left - bounds.width / 2 : 0}px`,
      "--source-y": `${source ? source.y - bounds.top - bounds.height / 2 : -60}px`,
      "--source-sx": source ? source.width / bounds.width : .35,
      "--source-sy": source ? source.height / bounds.height : .35,
      "--source-angle": `${source?.angle || 0}deg`,
    };
    const moving = { ...draw, flight, phase: "drawing" };
    let committed = false;
    const reveal = () => {
      if (committed) return;
      committed = true;
      setRevealed(draw.problem);
      // Only the owner saves the revealed card. Animation events never write
      // completion data or choose another problem.
      latest.current.onSelect(draw.problem);
    };
    const finish = () => {
      if (!animating.current) return;
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
      reveal();
      animating.current = false;
      finishActive.current = null;
      setDraw({ ...moving, phase: "settled" });
      latest.current.onDrawingChange(false);
      if (!autoDraw) {
        setHand(drawReviewCards(latest.current.pool, { ...latest.current.options, previousSlug: draw.problem.slug }));
        setDeal(value => value + 1);
      }
    };
    finishActive.current = finish;
    setDraw(moving);
    timers.current.push(window.setTimeout(() => {
      reveal();
      setDraw({ ...moving, phase: "revealing" });
    }, REVEAL_AT));
    timers.current.push(window.setTimeout(finish, DRAW_DURATION));
  }, [draw?.phase]);

  useEffect(() => {
    const settle = () => finishActive.current?.();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduceMotion = () => { if (media.matches) settle(); };
    // A resized viewport invalidates the measured trajectory. Land the same
    // card immediately, with the same once-only selection callback.
    window.addEventListener("resize", settle);
    media.addEventListener("change", reduceMotion);
    return () => {
      window.removeEventListener("resize", settle);
      media.removeEventListener("change", reduceMotion);
    };
  }, []);

  function drawRandom() {
    choose(drawReviewProblem(pool, selectedProblem?.slug || "", Math.random, options));
  }

  function moveFocus(event, index) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? hand.length - 1
      : (index + (event.key === "ArrowRight" ? 1 : -1) + hand.length) % hand.length;
    cards.current[next]?.focus();
  }

  const title = problem && (en ? problem.titleEn || problem.title || problem.slug : problem.title || problem.titleEn || problem.slug);
  const practiced = history?.lastPracticedAt;
  const formatted = practiced ? new Intl.DateTimeFormat(en ? "en-US" : "zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(practiced)) : "";

  return <div className={`lc-card-draw${autoDraw ? " is-automatic" : ""}${draw ? ` is-${draw.phase}` : ""}${!hand.length ? " is-empty" : ""}`} style={{ "--draw-duration": `${DRAW_DURATION}ms` }} aria-busy={drawing}>
    <div className="lc-dealer-scene">
      <span className="lc-dealer-halo" aria-hidden="true" />
      <span className="lc-dealer-shadow" aria-hidden="true" />
      <div className="lc-dealer-character"><img src={MASCOT} alt={t("小鲨鱼 Quanty 拿着复习卡牌", "Quanty the shark holding review cards")} draggable="false" /></div>
      <div className="lc-card-fan" role="group" aria-label={autoDraw ? t("Quanty 的抽卡牌组", "Quanty's card deck") : t("选择小鲨鱼手中的一张卡", "Pick a card from Quanty's hand")}
        onPointerDown={event => { if (event.pointerType === "touch") touch.current = { x: event.clientX, moved: false }; }}
        onPointerMove={event => {
          if (event.pointerType !== "touch" || !touch.current || disabled) return;
          if (Math.abs(event.clientX - touch.current.x) > 12) {
            touch.current.moved = true;
            const rect = event.currentTarget.getBoundingClientRect();
            setHovered(Math.max(0, Math.min(hand.length - 1, Math.floor((event.clientX - rect.left) / rect.width * hand.length))));
          }
        }}
        onPointerCancel={() => { touch.current = null; setHovered(null); }}
        onPointerLeave={event => { if (event.pointerType === "mouse") setHovered(null); }}>
        {hand.map((item, index) => {
          const offset = index - (hand.length - 1) / 2;
          const neighbor = hovered === null || hovered === index ? 0 : index < hovered ? -6 : 6;
          return <button key={`${deal}-${item.slug}`} ref={element => { cards.current[index] = element; }} type="button"
            className={`lc-hand-card${hovered === index ? " is-hovered" : ""}${draw?.index === index && (autoDraw || drawing) ? " is-picked" : ""}`}
            style={{ "--card-x": `calc(${offset} * var(--card-step) + ${neighbor}px)`, "--card-y": `${Math.abs(offset) * 8}px`, "--card-angle": `${offset * 10}deg`, "--card-order": index, "--deal-delay": `${index * 35}ms` }}
            disabled={disabled} aria-label={t(`选择第 ${index + 1} 张卡`, `Choose card ${index + 1}`)}
            onPointerEnter={event => { if (event.pointerType !== "touch" && !disabled) setHovered(index); }}
            onFocus={() => { if (!disabled) setHovered(index); }} onBlur={() => setHovered(null)} onKeyDown={event => moveFocus(event, index)}
            onClick={() => { if (touch.current?.moved) { touch.current = null; return; } touch.current = null; controls.current?.focus({ preventScroll: true }); choose(item, index); }}><CardBack /></button>;
        })}
      </div>
      {!autoDraw && <div className="lc-dealer-caption"><span>{t("挑一张", "Pick a card")}</span><button type="button" disabled={disabled || !hand.length} onClick={dealAgain} aria-label={t("换一手卡牌", "Deal another hand")}><RotateCcw size={12} aria-hidden="true" />{t("换一手", "Redeal")}</button></div>}
    </div>
    <div className="lc-card-draw-content">
      <div className="lc-reveal-slot">
        {problem ? <div ref={journey} className={`lc-card-journey${drawing ? " is-moving" : ""}${draw?.phase === "preparing" ? " is-preparing" : ""}`} style={draw?.flight}>
          <span className="lc-reveal-glow" aria-hidden="true" />
          <div className="lc-card-turn">
          <div className="lc-journey-back" aria-hidden="true"><CardBack /></div>
          <article className="lc-revealed-card" aria-labelledby="lc-revealed-title" aria-hidden={concealed || undefined} inert={concealed || undefined}>
          <div className="lc-revealed-top"><span>LeetCode <b>#{problem.frontendId || "—"}</b></span><span className={`lc-difficulty lc-difficulty-${problem.difficulty || "unknown"}`}>{labels[problem.difficulty] || "—"}</span></div>
          <h3 id="lc-revealed-title" ref={headingRef} tabIndex={-1}>{title}</h3>
          {!en && problem.titleEn && problem.titleEn !== title && <p className="lc-revealed-translation">{problem.titleEn}</p>}
          <div className="lc-revealed-bottom"><div><span>{t("上次完成", "Last completed")}</span>{practiced ? <time dateTime={practiced}>{formatted}</time> : <span className="lc-card-unknown">{t("暂无时间记录", "No time recorded")}</span>}</div><a href={problemUrl(problem.slug)} target="_blank" rel="noopener noreferrer" aria-label={`${t("去力扣挑战", "Solve on LeetCode")} ${title}`}><ArrowUpRight size={20} aria-hidden="true" /></a></div>
        </article>
          </div>
        </div> : <div className="lc-draw-invitation"><span className="lc-invitation-icon" aria-hidden="true"><Shuffle size={21} /></span><h3>{hand.length ? autoDraw ? t("Quanty 正在抽卡", "Quanty is drawing your card") : t("下一题，由你来抽", "Your next problem awaits") : t("暂无可抽取的题目", "No matching problems")}</h3>{!autoDraw && <p>{hand.length ? t("从 Quanty 手里挑一张，或点击抽取。", "Pick from Quanty's hand, or let Quanty draw for you.") : t("调整下方筛选后再试。", "Adjust your filters to try again.")}</p>}</div>}
      </div>
      {!autoDraw && <div className="lc-draw-controls"><button ref={controls} type="button" className="lc-button is-primary lc-draw-trigger" disabled={disabled || !pool.length} onClick={drawRandom}><Shuffle size={15} aria-hidden="true" />{drawing ? t("抽取中…", "Drawing…") : problem ? t("再抽一题", "Draw again") : t("抽取题目", "Draw a problem")}<ArrowRight size={15} aria-hidden="true" /></button></div>}
      <span className="lc-draw-announcement lc-sr-only" role="status" aria-live="polite">{concealed ? t("Quanty 正在抽卡", "Quanty is drawing a card") : problem ? `${t("抽到了", "Selected")} ${problem.frontendId || ""} ${title}` : ""}</span>
    </div>
  </div>;
}
