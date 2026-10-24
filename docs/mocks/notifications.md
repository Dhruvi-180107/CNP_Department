# Notifications — what is client-side today

The inbox keeps every existing endpoint and every derived value. Nothing below invents a
record: each row is an item returned by `GET /api/notifications`.

| What | Where | Why it is client-side today | Suggested API |
|---|---|---|---|
| Type filter (All / Requests / Clubs / Projects / Events / System) | Inbox toolbar, "All types" menu | `GET /notifications` returns one flat page of 50; there is no type or kind query param | `GET /notifications?type=<enum>&limit=` |
| Read-state counts on the All / Unread segment | Inbox toolbar | Counted from the loaded page. The endpoint also returns `unreadCount`, but the list itself is capped at 50, so the toolbar stays consistent with what is on screen | `GET /notifications?status=unread&limit=&cursor=` |
| "Mark unread" | Row hover tools, reading pane | No `PATCH /notifications/:id/unread` exists — only `/read` and `/read-all`. The action is omitted rather than faked locally, so a reload cannot contradict the UI | `PATCH /notifications/:id/unread` |
| Day groups (Today / Yesterday / Earlier) | Inbox list | Grouped from `createdAt` with `useMemo`; the server returns a flat newest-first list | none needed |
| Relative time on rows ("12m", "3h", "14:20", "24 Oct") | Inbox list | Derived from `createdAt`; the exact timestamp is in the row `title` and in the reading pane | none needed |
| Kind label ("Material rejected", "Mentor feedback", …) and family mark | Row mark, reading pane head | Derived from the `type` string plus the existing `title.includes('feedback')` check; there is no taxonomy field | `type` as a documented enum, or a `kind` field |
| Feedback / rejection quotes | Reading pane | Read from `metadata.feedbackText` and `metadata.reason` already present in the payload | none needed |

Marked with `// MOCK:` in `frontend/src/pages/Notifications/Notifications.tsx`.
