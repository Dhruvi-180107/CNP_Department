# Mocks · app shell

The frame, rail, header and route-transition loader. Everything shown here comes from
`/auth/me` or the notification API except the two items below.

| What | Where | Why it is client-side today | Suggested API |
|---|---|---|---|
| "Jump to" page search | Header, `/` shortcut | It filters the signed-in `NAVIGATION` array; there is no search endpoint and no more data than the destinations themselves. | `GET /search?q=<term>&scope=shell` returning the destinations and, later, clubs/projects/events by name. |
| Breadcrumb parent name on detail routes | Header, e.g. `Clubs / Club details` | The route carries only an id (`/clubs/:id`); the shell does not fetch a record just to label a crumb, so it names the collection and the kind of page. | `GET /clubs/:id/summary` (or a `name` in a lightweight detail response) so the crumb can read `Clubs / Photography Club`. |
| Relative notification time ("12m ago") | Notification popover | Derived in the browser from the real `createdAt`; no server formatting. | None needed unless timestamps must be server-relative to a fixed clock. |

Not mocked, deliberately:

- **Unread count in the rail.** The bell in the header owns the only unread fetch
  (`GET /notifications/unread-count`); adding a rail badge would mean a second fetch or a
  new context for the same number, so the rail stays quiet.
- **The loader's four ticks.** Tick four only closes when the page reports `isReady`
  (or when the caller's fallback releases it); the progress is real state, not a timer bar.
- **Role labels.** Human names are a fixed map of the five roles the API already returns.
