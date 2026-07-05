import { useMemo, useState } from "react";
import { useCommunityPageModel } from "./communityHooks.js";
import { useOwnedCosmetic } from "../shared/cosmetics.js";
import { StickerPicker } from "../shared/StickerPicker.jsx";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";

const TOPIC_RULES = [
  { label: "速算", color: "#ff9f2e", match: /速算|mental\s*math|心算/i },
  { label: "脑筋急转弯", color: "#5b5ff5", match: /脑筋急转弯|brain\s*teaser|谜题/i },
  { label: "衍生品", color: "#8a63e8", match: /衍生品|期权|option|greeks|hull|bsm/i },
  { label: "编程", color: "#2f9be0", match: /编程|coding|c\+\+|python|代码|leetcode/i },
  { label: "概率", color: "#d0524b", match: /概率|随机|probab|马尔可夫|布朗|鞅/i },
  { label: "职业", color: "#16a06a", match: /职业|求职|offer|career|入行/i }
];

const FORUM_BOARDS = [
  { name: "速算 Mental Math", color: "#ff9f2e", match: /速算|mental\s*math|心算/i },
  { name: "概率 & 随机", color: "#5b5ff5", match: /概率|随机|probab|马尔可夫|布朗|鞅/i },
  { name: "衍生品定价", color: "#8a63e8", match: /衍生品|期权|option|greeks|hull|bsm/i },
  { name: "求职 & 面经", color: "#16a06a", match: /面经|面试|interview|offer|求职/i, includeExperience: true },
  { name: "职业发展", color: "#2f9be0", match: /职业|career|晋升|入行/i }
];

const AVATAR_COLORS = ["#b3610a", "#5b5ff5", "#0f9d63", "#2f9be0", "#d0524b", "#8a63e8"];

function avatarColor(seed = "") {
  const value = String(seed || "");
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 997;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function deriveTopic(post) {
  if (post.kind === "experience") return { label: "面经", color: "#16a06a" };
  const text = String(post.text || "");
  const rule = TOPIC_RULES.find((entry) => entry.match.test(text));
  return rule || { label: "讨论", color: "#5b5ff5" };
}

function splitPostText(raw = "") {
  const clean = String(raw || "").trim();
  if (!clean) return { title: "", excerpt: "" };
  const newlineIndex = clean.indexOf("\n");
  if (newlineIndex > 0) {
    return {
      title: clean.slice(0, newlineIndex).trim(),
      excerpt: clean.slice(newlineIndex + 1).replace(/\s*\n\s*/g, " ").trim()
    };
  }
  if (clean.length > 64) {
    const sentence = clean.match(/^(.{12,64}?[。？！?!.])/);
    if (sentence) {
      return { title: sentence[1].trim(), excerpt: clean.slice(sentence[1].length).trim() };
    }
  }
  return { title: clean, excerpt: "" };
}

export function CommunityPageContent() {
  const model = useCommunityPageModel();
  const [commentDrafts, setCommentDrafts] = useState({});
  const [composerOpen, setComposerOpen] = useState(false);
  const [openReplies, setOpenReplies] = useState({});
  // Shop cosmetics — both read-only; unowned users see zero trace.
  const stickerPackOwned = useOwnedCosmetic("teacher");
  const frameOwned = useOwnedCosmetic("frame");
  const [stickerOpen, setStickerOpen] = useState(false);
  const currentUserId = model.currentUser?.id || "";
  // 庆典彩带头像框 only decorates the signed-in user's own avatar (we can
  // only know our own ownership honestly).
  const frameClassFor = (authorId) => (frameOwned && authorId && authorId === currentUserId ? " qg-frame-avatar" : "");

  useScopedRefreshIcons(model.refreshIcons, ".community-section", [
    model.posts,
    model.mediaPreview,
    model.filter,
    composerOpen,
    openReplies,
    stickerPackOwned,
    stickerOpen
  ]);

  const handleSubmit = (event) => {
    event.preventDefault();
    model.submitPost();
  };

  const boards = useMemo(() => FORUM_BOARDS.map((board) => ({
    ...board,
    count: (model.posts || []).filter((post) => (
      (board.includeExperience && post.kind === "experience") || board.match.test(String(post.text || ""))
    )).length
  })), [model.posts]);

  const activeUsers = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const byAuthor = new Map();
    (model.posts || []).forEach((post) => {
      const createdAt = new Date(post.createdAt || 0).getTime();
      if (Number.isFinite(createdAt) && createdAt > 0 && createdAt < weekAgo) return;
      const key = post.authorId || post.authorName || "?";
      const entry = byAuthor.get(key) || {
        id: key,
        name: post.authorName || "Quant",
        avatar: post.authorAvatar || "",
        posts: 0,
        likes: 0,
        comments: 0
      };
      entry.posts += 1;
      entry.likes += post.likes?.length || 0;
      entry.comments += post.comments?.length || 0;
      byAuthor.set(key, entry);
    });
    return [...byAuthor.values()]
      .map((entry) => ({ ...entry, score: entry.posts * 20 + entry.likes * 10 + entry.comments * 5 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [model.posts]);

  const toggleReplies = (postId) => {
    setOpenReplies((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <section className="community-section qg-support-page qg-community-page">
      <div className="section-heading community-heading">
        <div>
          <span className="community-kicker" aria-hidden="true">COMMUNITY · 论坛</span>
          <h2>
            论坛 <span className="community-title-accent">Forum</span>
          </h2>
          <small id="communitySummary">{model.t("communitySummary") || "和同路人讨论刷题、面试与职业选择"}</small>
        </div>
        <div className="forum-heading-actions">
          <div className="community-feed-tabs" role="tablist" aria-label={model.t("communityFilterAria") || "社群内容筛选"}>
            <button
              className={`segment${model.filter === "all" ? " active" : ""}`}
              type="button"
              data-community-filter="all"
              aria-selected={model.filter === "all"}
              onClick={() => model.setFilter("all")}
            >
              {model.t("communityFilterAll") || "全部动态"}
            </button>
            <button
              className={`segment${model.filter === "experience" ? " active" : ""}`}
              type="button"
              data-community-filter="experience"
              aria-selected={model.filter === "experience"}
              onClick={() => model.setFilter("experience")}
            >
              {model.t("communityFilterExperience") || "面经分享"}
            </button>
          </div>
          <button
            className="forum-post-cta"
            type="button"
            aria-expanded={composerOpen}
            aria-controls="communityForm"
            onClick={() => setComposerOpen((open) => !open)}
          >
            ＋ 发帖
          </button>
        </div>
      </div>

      <form
        className={`community-form${composerOpen ? "" : " hidden"}`}
        id="communityForm"
        onSubmit={handleSubmit}
      >
        <textarea
          id="communityText"
          rows={4}
          placeholder={model.t("communityComposePlaceholder") || "发一条动态：照片、视频、刷题进度、面试复盘都可以。"}
          value={model.text}
          onChange={(event) => model.setText(event.target.value)}
        />
        <div id="communityMediaPreview" className={`community-media-preview${model.mediaPreview ? "" : " hidden"}`}>
          {model.mediaPreview ? (
            <>
              {model.mediaPreview.type === "video" ? (
                <video src={model.mediaPreview.dataUrl} controls playsInline />
              ) : (
                <img src={model.mediaPreview.dataUrl} alt={model.mediaPreview.name || ""} />
              )}
              <button className="secondary-button" type="button" onClick={model.clearMedia}>
                {model.t("removeMedia") || "移除媒体"}
              </button>
            </>
          ) : null}
        </div>
        <div className="community-compose-actions">
          <label className="secondary-button file-button">
            <input
              id="communityMedia"
              type="file"
              accept="image/*,video/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) model.attachMedia(file);
                event.target.value = "";
              }}
            />
            <i data-lucide="image-plus" />
            {model.t("addMedia") || "添加照片/视频"}
          </label>
          {stickerPackOwned ? (
            <span className="qg-sticker-anchor">
              <button
                className={`secondary-button qg-sticker-btn${stickerOpen ? " is-open" : ""}`}
                type="button"
                aria-expanded={stickerOpen}
                aria-label="添加讲师鲨鱼贴纸"
                onClick={() => setStickerOpen((open) => !open)}
              >
                <i data-lucide="sticker" />
                贴纸
              </button>
              {stickerOpen ? (
                <StickerPicker
                  onPick={(sticker) => {
                    model.attachSticker(sticker);
                    setStickerOpen(false);
                  }}
                  onClose={() => setStickerOpen(false)}
                />
              ) : null}
            </span>
          ) : null}
          <button className="primary-button" type="submit">
            <i data-lucide="send" />
            {model.t("publish") || "发布"}
          </button>
        </div>
      </form>

      <div className="forum-workspace">
        <div className="community-list" id="communityList">
          {!model.posts.length ? (
            <div className="forum-empty">
              <p className="empty-copy">{model.t("communityEmpty") || "还没有动态。"}</p>
              <small>点击右上角「＋ 发帖」发起第一个讨论。</small>
            </div>
          ) : model.posts.map((post) => {
            const liked = post.likes?.includes(model.currentUser?.id);
            const topic = deriveTopic(post);
            const { title, excerpt } = splitPostText(post.text);
            const replyCount = post.comments?.length || 0;
            const hot = (post.likes?.length || 0) + replyCount >= 10;
            const repliesOpen = Boolean(openReplies[post.id]);
            return (
              <article key={post.id} className="forum-thread">
                <div className="forum-vote">
                  <button
                    className={`vote-btn${liked ? " is-voted" : ""}`}
                    type="button"
                    aria-pressed={liked}
                    aria-label={liked ? model.t("unlike") || "取消赞" : model.t("like") || "点赞"}
                    onClick={() => model.toggleLike(post.id)}
                  >
                    <i data-lucide="arrow-up" />
                  </button>
                  <span className={`vote-count${liked ? " is-voted" : ""}`}>{post.likes?.length || 0}</span>
                  <button className="vote-btn" type="button" aria-label="踩" tabIndex={-1}>
                    <i data-lucide="arrow-down" />
                  </button>
                </div>
                <div className="forum-thread-main">
                  <div className="forum-thread-chips">
                    <span className="forum-topic-chip" style={{ background: topic.color }}>{topic.label}</span>
                    {hot ? <span className="forum-hot-badge">🔥 热议</span> : null}
                  </div>
                  {title ? <div className="forum-thread-title">{title}</div> : null}
                  {excerpt ? <div className="forum-thread-excerpt">{excerpt}</div> : null}
                  {post.kind === "experience" && post.experience ? (
                    <div className="community-experience-meta">
                      <span className="community-experience-label">
                        <i data-lucide="notebook-pen" />
                        {model.t("experienceShare") || "面经分享"}
                      </span>
                      <span>{post.experience.stage}</span>
                      <span>{post.experience.season}</span>
                    </div>
                  ) : null}
                  {post.media ? (
                    <div className={`community-media${post.media.type === "image" && String(post.media.name || "").startsWith("贴纸") ? " qg-media-sticker" : ""}`}>
                      {post.media.type === "video" ? (
                        <video src={post.media.dataUrl} controls playsInline />
                      ) : (
                        <img src={post.media.dataUrl} alt={post.media.name || ""} />
                      )}
                    </div>
                  ) : null}
                  <div className="forum-thread-meta">
                    <span className="forum-thread-author">
                      <span className={`forum-thread-ava${frameClassFor(post.authorId)}`} style={{ background: avatarColor(post.authorName) }}>
                        {post.authorAvatar ? <img src={post.authorAvatar} alt="" /> : model.getInitials?.(post.authorName)}
                      </span>
                      {post.authorName}
                    </span>
                    <button
                      className="forum-replies-toggle"
                      type="button"
                      aria-expanded={repliesOpen}
                      onClick={() => toggleReplies(post.id)}
                    >
                      <i data-lucide="message-square" />
                      {replyCount} 回复
                    </button>
                    <span>· {model.formatPostDetail(post)}</span>
                    <span className="forum-thread-tools">
                      {post.authorId && post.authorId !== model.currentUser?.id ? (
                        <button
                          className="icon-button ghost"
                          type="button"
                          title={model.t("messageDirect") || "私信"}
                          aria-label={model.t("messageDirect") || "私信"}
                          onClick={() => model.startDirectMessage?.({ id: post.authorId, name: post.authorName, avatar: post.authorAvatar })}
                        >
                          <i data-lucide="message-square-text" />
                        </button>
                      ) : null}
                      {post.authorId === model.currentUser?.id ? (
                        <button
                          className="icon-button ghost danger"
                          type="button"
                          onClick={() => model.deletePost(post.id)}
                          aria-label={model.t("deletePost") || "删除"}
                        >
                          <i data-lucide="trash-2" />
                        </button>
                      ) : null}
                    </span>
                  </div>
                  <div className={`community-comments${repliesOpen ? "" : " hidden"}`}>
                    {post.comments?.slice(-4).map((comment) => (
                      <div key={comment.id} className="community-comment">
                        <strong>{comment.authorName}</strong>
                        <span>{comment.text}</span>
                      </div>
                    ))}
                    <form
                      className="community-comment-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const value = commentDrafts[post.id] || "";
                        model.addComment(post.id, value);
                        setCommentDrafts((prev) => ({ ...prev, [post.id]: "" }));
                      }}
                    >
                      <input
                        type="text"
                        placeholder={model.t("commentPlaceholder") || "写评论"}
                        value={commentDrafts[post.id] || ""}
                        onChange={(event) => setCommentDrafts((prev) => ({ ...prev, [post.id]: event.target.value }))}
                      />
                      <button className="icon-button ghost" type="submit" title={model.t("comment") || "评论"}>
                        <i data-lucide="send" />
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="forum-side">
          <div className="forum-panel forum-boards">
            <div className="forum-panel-title">热门板块</div>
            <div className="forum-board-list">
              {boards.map((board) => (
                <div key={board.name} className="forum-board-row">
                  <span className="forum-board-dot" style={{ background: board.color }} />
                  <span className="forum-board-name">{board.name}</span>
                  <span className="forum-board-count">{board.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="forum-panel forum-active-users">
            <div className="forum-panel-title">本周活跃</div>
            <div className="forum-user-list">
              {!activeUsers.length ? (
                <p className="forum-empty-line">本周还没有活跃成员，发个帖聊聊吧。</p>
              ) : activeUsers.map((user) => (
                <div key={user.id} className="forum-user-row">
                  <div className={`forum-user-ava${frameClassFor(user.id)}`} style={{ background: avatarColor(user.name) }}>
                    {user.avatar ? <img src={user.avatar} alt="" /> : model.getInitials?.(user.name)}
                  </div>
                  <div className="forum-user-main">
                    <div className="forum-user-name">{user.name}</div>
                    <div className="forum-user-role">{user.posts} 帖子 · {user.likes} 获赞</div>
                  </div>
                  <span className="forum-user-xp">
                    <img src="/assets/generated/playful-precision/reward-xp.webp" alt="" />
                    {user.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
