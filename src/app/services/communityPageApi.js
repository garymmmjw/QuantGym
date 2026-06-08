import { buildDirectMessageStart } from "../../modules/community/messages.js";

export function createCommunityPageApi(deps = {}) {
  const loadStore = () => deps.loadCommunity?.() || deps.appState?.community || { posts: [], threads: [] };

  const persistStore = (store, options = {}) => {
    deps.appState.community = store;
    deps.saveCommunity?.(options);
    deps.communityStore?.actions?.replace?.(store);
    window.dispatchEvent(new CustomEvent("quantgym:community-updated"));
  };

  return {
    getPosts() {
      return loadStore().posts || [];
    },

    getFilter() {
      return deps.communityFilterState?.getFilter?.() || "all";
    },

    setFilter(value) {
      deps.communityFilterState?.setFilter?.(value);
      window.dispatchEvent(new CustomEvent("quantgym:community-updated"));
    },

    filterPosts(posts = []) {
      const filter = this.getFilter();
      if (filter === "experience") return posts.filter((post) => post.kind === "experience");
      return posts;
    },

    addPost({ text = "", media = null } = {}) {
      const currentUser = deps.appState?.currentUser;
      if (!currentUser) return { ok: false };
      const body = String(text || "").trim();
      if (!body && !media) return { ok: false, code: "empty" };

      const store = loadStore();
      store.posts.unshift(deps.normalizeCommunityPost?.({
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
      return { ok: true };
    },

    toggleLike(postId) {
      const currentUser = deps.appState?.currentUser;
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
    },

    addComment(postId, value) {
      const currentUser = deps.appState?.currentUser;
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
            deps.normalizeCommunityComment?.({
              authorId: currentUser.id,
              authorName: currentUser.name || currentUser.email || "Quant",
              text: body,
              createdAt: new Date().toISOString()
            })
          ]
        };
      });
      persistStore(store);
    },

    deletePost(postId) {
      const store = loadStore();
      const deleted = store.posts.find((post) => post.id === postId);
      if (!deleted) return false;
      const message = deleted.kind === "experience"
        ? (deps.t?.("deleteSharedExperience") || "确认删除这条已分享的面经动态？")
        : (deps.t?.("deletePost") || "确认删除这条动态？");
      if (!window.confirm(message)) return false;
      store.posts = store.posts.filter((post) => post.id !== postId);
      persistStore(store);
      if (deleted.kind === "experience") deps.clearExperiencePost?.(postId);
      return true;
    },

    startDirectMessage(user) {
      const result = buildDirectMessageStart(loadStore(), deps.appState?.currentUser, user, {
        makeId: deps.makeId,
        introText: deps.t?.("networkConnectMessage") || ""
      });
      if (!result.ok) return result;
      if (result.changed) {
        persistStore(result.store);
      } else {
        deps.appState.community = result.store;
        deps.communityStore?.actions?.replace?.(result.store);
      }
      deps.messageSelectionState?.setSelected?.(result.threadId);
      deps.updateUnreadMessageBadge?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("quantgym:navigate-module", {
          detail: { moduleId: "messages" }
        }));
      } else {
        deps.startDirectMessageWithUser?.(user);
      }
      return result;
    },

    formatPostDetail(post) {
      return deps.formatCommunityPostDetail?.(post) || "";
    }
  };
}
