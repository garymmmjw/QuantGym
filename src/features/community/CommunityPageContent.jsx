import { useState } from "react";
import { useCommunityPageModel } from "./communityHooks.js";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";

export function CommunityPageContent() {
  const model = useCommunityPageModel();
  const [commentDrafts, setCommentDrafts] = useState({});

  useScopedRefreshIcons(model.refreshIcons, ".community-section", [model.posts, model.mediaPreview, model.filter]);

  const handleSubmit = (event) => {
    event.preventDefault();
    model.submitPost();
  };

  return (
    <section className="community-section">
      <div className="section-heading">
        <div>
          <h2>{model.t("communityPageTitle") || "社区"}</h2>
          <small id="communitySummary">{model.t("communitySummary") || "像朋友圈一样分享训练动态，也可以点赞评论。"}</small>
        </div>
      </div>

      <form className="community-form" id="communityForm" onSubmit={handleSubmit}>
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
          <button className="primary-button" type="submit">
            <i data-lucide="send" />
            {model.t("publish") || "发布"}
          </button>
        </div>
      </form>

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

      <div className="community-list" id="communityList">
        {!model.posts.length ? (
          <p className="empty-copy">{model.t("communityEmpty") || "还没有动态。"}</p>
        ) : model.posts.map((post) => {
          const liked = post.likes?.includes(model.currentUser?.id);
          return (
            <article key={post.id} className="community-card">
              <div className="community-head">
                <div className="avatar">
                  {post.authorAvatar ? <img src={post.authorAvatar} alt="" /> : model.getInitials?.(post.authorName)}
                </div>
                <div>
                  <strong>{post.authorName}</strong>
                  <small>{model.formatPostDetail(post)}</small>
                </div>
                {post.authorId === model.currentUser?.id ? (
                  <button className="icon-button ghost danger" type="button" onClick={() => model.deletePost(post.id)} aria-label={model.t("deletePost") || "删除"}>
                    <i data-lucide="trash-2" />
                  </button>
                ) : null}
              </div>
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
              {post.text ? <p>{post.text}</p> : null}
              {post.media ? (
                <div className="community-media">
                  {post.media.type === "video" ? (
                    <video src={post.media.dataUrl} controls playsInline />
                  ) : (
                    <img src={post.media.dataUrl} alt={post.media.name || ""} />
                  )}
                </div>
              ) : null}
              <div className="community-actions">
                <button className={`secondary-button${liked ? " active-like" : ""}`} type="button" onClick={() => model.toggleLike(post.id)}>
                  <i data-lucide="heart" />
                  {liked ? model.t("unlike") || "取消赞" : model.t("like") || "点赞"} - {post.likes?.length || 0}
                </button>
                {post.authorId && post.authorId !== model.currentUser?.id ? (
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => model.startDirectMessage?.({ id: post.authorId, name: post.authorName, avatar: post.authorAvatar })}
                  >
                    <i data-lucide="message-square-text" />
                    {model.t("messageDirect") || "私信"}
                  </button>
                ) : null}
                <span className="community-count">{post.comments?.length || 0} {model.t("comment") || "评论"}</span>
              </div>
              <div className="community-comments">
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
            </article>
          );
        })}
      </div>
    </section>
  );
}
