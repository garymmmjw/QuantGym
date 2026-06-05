import { readFileAsDataUrl } from '../../lib/files.js';
import { listen } from '../../ui/events.js';

export function createCommunityModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const getCurrentUser = () => deps.getCurrentUser?.() || null;
  const getFilter = () => deps.getFilter?.() || "all";
  const text = (key, params) => deps.t?.(key, params) || key;
  const escape = (value) => deps.escapeHtml?.(String(value ?? "")) ?? String(value ?? "");
  const label = (key) => {
    const value = deps.labels?.[key];
    return typeof value === "function" ? value() : value || key;
  };
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };

  const loadStore = () => deps.loadCommunity?.() || { posts: [], threads: [] };
  const persistStore = (store, options) => {
    deps.setCommunity?.(store);
    deps.saveCommunity?.(options);
  };

  const getComposer = (scope) => {
    const els = getElements();
    const isOverview = scope === "overview";
    return {
      form: isOverview ? els.overviewCommunityForm : els.communityForm,
      text: isOverview ? els.overviewCommunityText : els.communityText,
      media: isOverview ? els.overviewCommunityMedia : els.communityMedia,
      preview: isOverview ? els.overviewCommunityMediaPreview : els.communityMediaPreview
    };
  };

  const renderMedia = (container, media) => {
    if (!container) return;
    container.innerHTML = "";
    if (media.type === "video") {
      const video = document.createElement("video");
      video.src = media.dataUrl;
      video.controls = true;
      video.playsInline = true;
      container.appendChild(video);
      return;
    }
    const image = document.createElement("img");
    image.src = media.dataUrl;
    image.alt = media.name || "community media";
    container.appendChild(image);
  };

  const resetComposer = (scope) => {
    const composer = getComposer(scope);
    if (!composer.form) return;
    composer.form.reset();
    delete composer.form.dataset.mediaData;
    delete composer.form.dataset.mediaType;
    delete composer.form.dataset.mediaName;
    composer.preview.innerHTML = "";
    composer.preview.classList.add("hidden");
  };

  const handleMedia = async (scope, event) => {
    const composer = getComposer(scope);
    const file = event.target.files?.[0];
    delete composer.form.dataset.mediaData;
    delete composer.form.dataset.mediaType;
    delete composer.form.dataset.mediaName;
    composer.preview.classList.add("hidden");
    composer.preview.innerHTML = "";
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      event.target.value = "";
      return;
    }
    if (file.size > 5_000_000) {
      window.alert(text("mediaTooLarge"));
      event.target.value = "";
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    const type = file.type.startsWith("video/") ? "video" : "image";
    composer.form.dataset.mediaData = dataUrl;
    composer.form.dataset.mediaType = type;
    composer.form.dataset.mediaName = file.name;
    renderMedia(composer.preview, { dataUrl, type, name: file.name });
    composer.preview.classList.remove("hidden");
  };

  const formatPostCount = (count) => {
    if (deps.getLanguage?.() === "en") {
      return `${count} ${count === 1 ? text("communityPostSingular") : text("communityPostPlural")}`;
    }
    return `${count} ${text("communityPostPlural")}`;
  };

  const addPost = (scope) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const composer = getComposer(scope);
    const body = composer.text.value.trim();
    const media = composer.form.dataset.mediaData ? {
      dataUrl: composer.form.dataset.mediaData,
      type: composer.form.dataset.mediaType === "video" ? "video" : "image",
      name: composer.form.dataset.mediaName || ""
    } : null;

    if (!body && !media) {
      window.alert(text("writeSomething"));
      return;
    }

    const store = loadStore();
    store.posts.unshift(deps.normalizePost?.({
      authorId: currentUser.id,
      authorName: currentUser.name || currentUser.email || "Quant",
      authorAvatar: currentUser.picture || "",
      country: currentUser.country,
      region: currentUser.region,
      text: body,
      media,
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    }));
    persistStore(store);
    resetComposer(scope);
    render();
  };

  const toggleLike = (postId) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const store = loadStore();
    store.posts = store.posts.map((post) => {
      if (post.id !== postId) return post;
      const likes = post.likes.includes(currentUser.id)
        ? post.likes.filter((id) => id !== currentUser.id)
        : [...post.likes, currentUser.id];
      return { ...post, likes };
    });
    persistStore(store);
    render();
  };

  const addComment = (postId, value) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const body = String(value || "").trim();
    if (!body) return;
    const store = loadStore();
    store.posts = store.posts.map((post) => {
      if (post.id !== postId) return post;
      return {
        ...post,
        comments: [
          ...post.comments,
          deps.normalizeComment?.({
            authorId: currentUser.id,
            authorName: currentUser.name || currentUser.email || "Quant",
            text: body,
            createdAt: new Date().toISOString()
          })
        ]
      };
    });
    persistStore(store);
    render();
  };

  const deletePost = (postId) => {
    const store = loadStore();
    const deleted = store.posts.find((post) => post.id === postId);
    if (!deleted || !window.confirm(deleted.kind === "experience" ? label("deleteSharedExperience") : label("deletePost"))) return;
    store.posts = store.posts.filter((post) => post.id !== postId);
    persistStore(store);
    if (deleted?.kind === "experience") deps.clearExperiencePost?.(postId);
    render();
  };

  const renderList = (container, posts, options = {}) => {
    const currentUser = getCurrentUser();
    if (!container) return;
    container.innerHTML = "";
    if (!posts.length) {
      container.appendChild(deps.emptyBlock?.(options.emptyText || text("communityEmpty")) || document.createTextNode(""));
      return;
    }

    posts.forEach((post) => {
      const card = document.createElement("article");
      card.className = "community-card";

      const head = document.createElement("div");
      head.className = "community-head";
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      if (post.authorAvatar) {
        const image = document.createElement("img");
        image.src = post.authorAvatar;
        image.alt = "";
        avatar.appendChild(image);
      } else {
        avatar.textContent = deps.getInitials?.(post.authorName) || "Q";
      }
      const meta = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = post.authorName;
      const detail = document.createElement("small");
      detail.textContent = deps.formatPostDetail?.(post) || "";
      meta.append(name, detail);
      head.append(avatar, meta);
      if (post.authorId === currentUser?.id) {
        const remove = document.createElement("button");
        remove.className = "icon-button ghost danger";
        remove.type = "button";
        remove.title = text("deletePost");
        remove.setAttribute("aria-label", text("deletePost"));
        remove.innerHTML = '<i data-lucide="trash-2"></i>';
        remove.addEventListener("click", () => deletePost(post.id));
        head.appendChild(remove);
      }

      const body = document.createElement("p");
      body.textContent = post.text;

      card.appendChild(head);
      if (post.kind === "experience" && post.experience) {
        const experienceMeta = document.createElement("div");
        experienceMeta.className = "community-experience-meta";
        experienceMeta.innerHTML = `
          <span class="community-experience-label"><i data-lucide="notebook-pen"></i> ${escape(label("experienceShare"))}</span>
          <span>${escape(post.experience.stage)}</span>
          <span>${escape(post.experience.season)}</span>
          ${post.experience.tags.slice(0, 3).map((tag) => `<span>${escape(tag)}</span>`).join("")}
        `;
        card.appendChild(experienceMeta);
      }
      if (post.text) card.appendChild(body);
      if (post.media) {
        const mediaWrap = document.createElement("div");
        mediaWrap.className = "community-media";
        renderMedia(mediaWrap, post.media);
        card.appendChild(mediaWrap);
      }

      const actions = document.createElement("div");
      actions.className = "community-actions";
      const liked = post.likes.includes(currentUser?.id || "");
      const likeButton = document.createElement("button");
      likeButton.className = `secondary-button${liked ? " active-like" : ""}`;
      likeButton.type = "button";
      likeButton.innerHTML = `<i data-lucide="heart"></i> ${liked ? text("unlike") : text("like")} - ${post.likes.length}`;
      likeButton.addEventListener("click", () => toggleLike(post.id));
      actions.appendChild(likeButton);
      if (post.authorId && post.authorId !== currentUser?.id) {
        const messageButton = document.createElement("button");
        messageButton.className = "secondary-button";
        messageButton.type = "button";
        messageButton.innerHTML = `<i data-lucide="message-square-text"></i> ${text("messageDirect")}`;
        messageButton.addEventListener("click", () => deps.startDirectMessage?.({
          id: post.authorId,
          name: post.authorName,
          avatar: post.authorAvatar
        }));
        actions.appendChild(messageButton);
      }

      if (!options.compact) {
        const commentCount = document.createElement("span");
        commentCount.className = "community-count";
        commentCount.textContent = `${post.comments.length} ${text("comment")}`;
        actions.appendChild(commentCount);
      }
      card.appendChild(actions);

      if (!options.compact) {
        const comments = document.createElement("div");
        comments.className = "community-comments";
        post.comments.slice(-4).forEach((comment) => {
          const item = document.createElement("div");
          item.className = "community-comment";
          const author = document.createElement("strong");
          author.textContent = comment.authorName;
          const commentBody = document.createElement("span");
          commentBody.textContent = comment.text;
          item.append(author, commentBody);
          comments.appendChild(item);
        });
        const form = document.createElement("form");
        form.className = "community-comment-form";
        const input = document.createElement("input");
        input.type = "text";
        input.placeholder = text("commentPlaceholder");
        const button = document.createElement("button");
        button.className = "icon-button ghost";
        button.type = "submit";
        button.title = text("comment");
        button.setAttribute("aria-label", text("comment"));
        button.innerHTML = '<i data-lucide="send"></i>';
        form.append(input, button);
        form.addEventListener("submit", (event) => {
          event.preventDefault();
          addComment(post.id, input.value);
        });
        comments.appendChild(form);
        card.appendChild(comments);
      }

      container.appendChild(card);
    });
  };

  const render = () => {
    const els = getElements();
    const store = loadStore();
    deps.setCommunity?.(store);
    const currentFilter = getFilter();
    const visiblePosts = currentFilter === "experience"
      ? store.posts.filter((post) => post.kind === "experience")
      : store.posts;
    renderList(els.overviewCommunityList, store.posts.slice(0, 3), { compact: true });
    renderList(els.communityList, visiblePosts, {
      compact: false,
      emptyText: currentFilter === "experience" ? label("emptyExperience") : text("communityEmpty")
    });
    document.querySelectorAll("[data-community-filter]").forEach((button) => {
      button.classList.toggle("active", button.dataset.communityFilter === currentFilter);
    });
    if (els.overviewCommunitySummary) {
      els.overviewCommunitySummary.textContent = store.posts.length
        ? formatPostCount(store.posts.length)
        : text("overviewCommunitySummary");
    }
    if (els.communitySummary) {
      const experienceCountLabel = deps.labels?.experienceCount;
      els.communitySummary.textContent = visiblePosts.length
        ? currentFilter === "experience"
          ? (typeof experienceCountLabel === "function" ? experienceCountLabel(visiblePosts.length) : label("experienceCount"))
          : formatPostCount(visiblePosts.length)
        : text("communitySummary");
    }
    deps.refreshIcons?.();
  };

  const setFilter = (value) => {
    deps.setFilter?.(value === "experience" ? "experience" : "all");
    render();
  };

  const api = {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.communityForm, "submit", (event) => {
        event.preventDefault();
        addPost("full");
      });

      bind(els.communityMedia, "change", (event) => {
        handleMedia("full", event);
      });

      document.querySelectorAll("[data-community-filter]").forEach((button) => {
        bind(button, "click", () => {
          setFilter(button.dataset.communityFilter === "experience" ? "experience" : "all");
        });
      });
    },

    render,
    addPost,
    handleMedia,
    setFilter,

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };

  return api;
}
