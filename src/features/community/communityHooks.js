import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore, useAppStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";

export function useCommunityPageModel() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const currentUser = useAuthStore((state) => state.currentUser);
  const community = useAppStore((state) => state.community);
  const api = usePageApi("community");
  const t = appServices.t || ((key) => key);
  const [revision, setRevision] = useState(0);
  const [filter, setFilterState] = useState(() => api?.getFilter?.() || "all");
  const [text, setText] = useState("");
  const [mediaPreview, setMediaPreview] = useState(null);

  useEffect(() => {
    const onUpdate = () => setRevision((value) => value + 1);
    window.addEventListener("quantgym:community-updated", onUpdate);
    return () => window.removeEventListener("quantgym:community-updated", onUpdate);
  }, []);

  const posts = useMemo(() => {
    const all = api?.getPosts?.() || community?.posts || [];
    return api?.filterPosts?.(all) || all;
  }, [api, community, filter, revision]);

  const setFilter = useCallback((value) => {
    api?.setFilter?.(value);
    setFilterState(value);
  }, [api]);

  const submitPost = useCallback(async () => {
    const result = api?.addPost?.({ text, media: mediaPreview });
    if (!result?.ok) {
      if (result?.code === "empty") window.alert(t("writeSomething") || "写点什么或添加媒体。");
      return;
    }
    setText("");
    setMediaPreview(null);
    appServices.services?.refreshIcons?.();
  }, [api, text, mediaPreview, appServices, t]);

  const attachMedia = useCallback(async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return;
    if (file.size > 5_000_000) {
      window.alert(t("mediaTooLarge") || "媒体文件太大。");
      return;
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setMediaPreview({
      dataUrl,
      type: file.type.startsWith("video/") ? "video" : "image",
      name: file.name
    });
  }, [t]);

  return {
    t,
    currentUser,
    posts,
    filter,
    setFilter,
    text,
    setText,
    mediaPreview,
    clearMedia: () => setMediaPreview(null),
    attachMedia,
    submitPost,
    toggleLike: (id) => api?.toggleLike?.(id),
    addComment: (id, value) => api?.addComment?.(id, value),
    deletePost: (id) => api?.deletePost?.(id),
    startDirectMessage: (user) => api?.startDirectMessage?.(user),
    formatPostDetail: (post) => api?.formatPostDetail?.(post) || "",
    getInitials: pageApi?.getInitials,
    refreshIcons: appServices.services?.refreshIcons
  };
}
