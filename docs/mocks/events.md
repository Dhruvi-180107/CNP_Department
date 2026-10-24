# Events — what is derived, filtered or mocked on the client

The events area uses the existing endpoints unchanged: `GET /clubs`, `GET /events`
(faculty coordinator and club admin), `GET /events/upcoming?from=` (students and other roles),
`POST /events`, `PUT /events/:id`, `DELETE /events/:id`. Permission checks (`canManageEvent`,
`canAddEvent`) and the local-day helpers (`partitionEvents`, `isEventPast`, `localDayStartIso`,
`useLocalDay`) are untouched.

Everything below is computed from data those calls already return.

| What | Where | Why it is client-side today | Suggested API |
|---|---|---|---|
| "N upcoming this month" count, the month grid and its "N events" meta | `/events` page-head ledger; month panel | The page has no month-scoped call — it slices the list it already holds. Marked `// MOCK:` in `Events.tsx` | `GET /events?month=YYYY-MM` or `GET /events/summary?month=YYYY-MM` returning counts |
| "N past" count and the past group | Agenda view, "Past events" disclosure | Only `/events` (all events) is available and only to coordinators/admins; there is no `/events/past` | `GET /events/past?before=&limit=` |
| Past events are invisible to students | Month grid for a month that has ended | `GET /events/upcoming?from=` only returns today onward, so an elapsed month renders empty even though events happened | Let `/events/upcoming` accept `from` in the past, or expose `GET /events?window=` to all signed-in roles |
| Club filter (`All clubs · N`, single-club view) | Page-head select and the "Clubs" rail on `/events` | `GET /events` takes no query parameters; the page filters the array it holds (the behaviour that existed before the redesign) | `GET /events?clubId=` |
| Per-club event counts for the visible month | "Clubs" panel in the month rail | Client-side tally over the month's events, kept from the unfiltered list so the panel works as a filter switcher. Marked `// MOCK:` | Include `clubId` counts in a month summary endpoint |
| "In 7 days" / "Today" / "17 days ago" labels | Event detail, agenda group heads | Derived from `eventDate` and the local day, no server field | Not needed — this is presentation |
| Agenda grouping by day | Agenda view, selected-day panel | Groups the fetched list by local calendar day (the same rule `partitionEvents` uses) | Not needed |
| Event organiser name and role | Event detail "Organiser" row | Reads the populated `createdBy` that `GET /events` already returns; falls back to "Not recorded" when it is absent | None |

## Flow change worth knowing

`DELETE /events/:id` is still the same call behind the same guard (an explicit confirmation before
the request), but the styled inline confirm inside the event detail replaces `window.confirm`, which
the redesign brief permits. The event-level delete button now lives in the detail modal rather than
on every card, so the capability is reachable in one extra step.

Editing moved from an inline panel at the top of the page into a modal; the form's fields,
validation, `FormData` payload and `PUT`/`POST` choice are unchanged.
