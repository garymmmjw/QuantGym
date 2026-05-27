# UI Reference Archive

This directory is an index for local UI, brand, mascot, and module-reference images used during design iteration. The large PNG reference files are intentionally ignored by Git so the application repository stays small.

Runtime assets that the product actually loads live in `assets/generated/`.

## Local Reference Sets

The local archive may include these folders:

- `2026-05-22-10-brand-direction/`: first brand direction, dashboard, challenge, rewards, and mascot references.
- `2026-05-22-11-mascot-rewards/`: QuantGym logo, Q mark, badge, streak, XP, feature-card, and mascot references.
- `2026-05-22-19-module-radar/`: radar, jobs, resume, network, news, PK, interview, problem bank, community, and dashboard references.

## Rules

- Do not reference files in this folder from production UI.
- Promote only processed runtime assets to `assets/generated/`.
- Keep large source/reference images local or in external design storage.
- If a future reference image must be committed, keep it small and document why it belongs in Git.
