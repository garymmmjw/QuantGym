export function publishExperienceRecord(options = {}) {
  const records = Array.isArray(options.records) ? options.records : [];
  const community = options.community || {};
  const posts = Array.isArray(community.posts) ? community.posts : [];
  const currentUser = options.currentUser;
  const record = records.find((item) => item.id === options.recordId);
  if (!record || !currentUser) return { ok: false };

  const makeId = options.makeId || (() => `${Date.now()}-${Math.random()}`);
  const normalizePost = options.normalizePost || ((post) => post);
  const normalizeExperience = options.normalizeExperience || ((experience) => experience);
  const formatText = options.formatText || (() => "");
  const now = options.now || new Date().toISOString();
  const existing = posts.find((post) => post.id === record.sharedPostId);
  const postId = existing?.id || record.sharedPostId || makeId();
  const post = normalizePost({
    ...existing,
    id: postId,
    kind: "experience",
    experience: record,
    authorId: currentUser.id,
    authorName: currentUser.name || currentUser.email || "Quant",
    authorAvatar: currentUser.picture || "",
    country: currentUser.country,
    region: currentUser.region,
    text: formatText(record),
    likes: existing?.likes || [],
    comments: existing?.comments || [],
    createdAt: existing?.createdAt || now
  });

  return {
    ok: true,
    postId,
    community: {
      ...community,
      posts: [post, ...posts.filter((item) => item.id !== postId)]
    },
    records: records.map((item) => item.id === record.id
      ? normalizeExperience({ ...item, sharedPostId: postId, sharedAt: now, updatedAt: now })
      : item)
  };
}

export function clearExperienceShareForPost(records = [], postId = "", options = {}) {
  const normalizeExperience = options.normalizeExperience || ((experience) => experience);
  const now = options.now || new Date().toISOString();
  return (Array.isArray(records) ? records : []).map((record) => record.sharedPostId === postId
    ? normalizeExperience({ ...record, sharedPostId: "", sharedAt: "", updatedAt: now })
    : record);
}
