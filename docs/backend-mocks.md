# Backend wiring backlog

Everything the redesigned interface derives, filters or works around on the client, written
down so it can be moved into the API later. **No screen shows invented data** — every number
on every page is a length, a sum, a deduplication or a slice of a real response. What follows
is the list of places where the browser is doing work the server should eventually own.

Source of truth for each area: `docs/mocks/*.md` (one file per area, written by the team that
built it). Code that depends on a client-side rule carries a `// MOCK:` comment — grep it:

```bash
grep -rn "// MOCK:" frontend/src
```

How to read the tables: **today** is what the UI does now, **suggested** is the smallest
endpoint change that would let it stop.

---

## 1. Aggregates the pages currently compute themselves

These are the highest-value changes: they remove an N+1 or replace a client sum with a
server truth, and every one of them is already needed by more than one screen.

| Capability | Where it shows up | Today | Suggested |
|---|---|---|---|
| Dashboard summary for a student | `/dashboard` stat strip, next-up countdown | Sorted and diffed from `/events/upcoming`, `/notifications`, membership lists | `GET /students/me/summary` → `{ nextEvent, daysUntil, eventsAhead, clubRoles, projectRoles, unread }` |
| Clubs summary | `/clubs` head (`3 clubs · 10 members · 2 coordinators`), board footer | Summed over `GET /clubs` | `GET /clubs/summary` |
| Projects summary | `/projects` foot (`3 projects · 4 students · 3 team leaders`), "You" panel | Joined from `GET /projects` + per-project members | `GET /projects/summary` → counts + `mine: { leading, member }` |
| Inventory summary | `/inventory` stats, project-admin ops strip (`57 of 215 units on loan`) | Summed over `GET /inventory` | `GET /inventory/summary` → `{ items, unitsTotal, unitsOnLoan, lowStock }` |
| Material-request summary | `/material-requests` stats (`oldest waiting 2h`, units requested), project-admin queue | Derived from the request list | `GET /material-requests/summary` → `{ pending, unitsPending, oldestPendingAt, resolved }` |
| Events month summary | `/events` month panel meta, "Clubs this month" rail | Sliced from the full event list | `GET /events/summary?month=YYYY-MM` → counts per club and status |
| Coordinator review queue | Coordinator dashboard "Requests to review" | Merged from one `GET /join-requests/club/:id` per club, then sorted | `GET /join-requests/reviewer?status=pending` |

## 2. N+1 calls that should be one request

| Call pattern | Where | Today | Suggested |
|---|---|---|---|
| Club membership resolution | Student dashboard, `/clubs` "My clubs" | `GET /clubs/:id/members` **per club** to learn the student's role (documented in `AGENTS.md`) | `GET /clubs?scope=joined` returning `myMembership` on each club |
| Project roster + relation | `/projects` rows, "Students on teams" total | `GET /projects/:id/members` **per project** + `GET /join-requests/student` | `memberCount` and `myRelation` on each project in `GET /projects`, or `GET /projects?mine=1` |
| Team size for a mentor | Mentor dashboard rows (currently omitted) | Not available — `/mentors/:id/projects` has no member count | Add `memberCount` to the project object in that payload |

## 3. Filters and search

All of these work today, but the browser fetches the full list and narrows it.

| What | Where | Suggested |
|---|---|---|
| Club directory search (name, description, coordinator, department) | `/clubs` | `GET /clubs?q=` |
| "My clubs" filter | `/clubs` | `GET /clubs?scope=joined` |
| Member search and ordering inside a club | Club detail members panel | `GET /clubs/:id/members?q=&sort=role,name` |
| Project search, status filter, status grouping | `/projects` | `GET /projects?status=&q=` |
| Project member / mentor ordering (leader first) | Project detail roster | Sort server-side, or accept client order |
| Event club filter and month window | `/events` | `GET /events?clubId=&month=YYYY-MM` |
| Past events for students | `/events` agenda | Students only receive `/events/upcoming`; let it accept a `from` in the past, or expose `GET /events?window=` |
| Notification type filter and unread list | `/notifications` | `GET /notifications?type=&status=unread&limit=&cursor=` |
| Inventory search and category filter | `/inventory` | `GET /inventory?q=&category=` |
| Material-request status / project / text filters | `/material-requests` | `GET /material-requests?status=&projectId=&q=` |

## 4. Fields the UI wants that the payload does not carry

| Field | Where it is wanted | Why | Suggested |
|---|---|---|---|
| `club.memberCount` / `coreTeamCount` on the **detail** endpoint | Club detail composition meter | `/clubs` returns them, `/clubs/:id` does not, so the page counts the member array | Add both counts to `GET /clubs/:id` |
| `club.pendingRequestCount` | Club rows (coordinator, club admin), "Needs review" | Grouped from the request list | Add to `GET /clubs` |
| `club.foundedAt` | Club detail "Created" cell | Currently uses `createdAt`, which is when the record was created, not when the club was founded | `foundedAt` if the department keeps one |
| `club.featured` | `/clubs` lead-club treatment | The page picks "newest club you belong to, else newest club" | A `featured` flag, or `GET /clubs?featured=1` |
| `project.myRelation` / `memberCount` | `/projects` rows (status + "You lead / Member / Request pending") | Needs a per-project roster call today | Include in the directory payload |
| `project.pendingJoinRequests` | Project detail facts aside | Count lifted from the join-request panel's own fetch | Add the count to `GET /projects/:id` |
| `notifications.type` as a documented enum | Inbox type filter and kind labels | The UI infers a family from the free-text `type` string | Document `type` values, or add `kind` |
| `user.createdAt` | Profile "Member since" | Returned by Mongoose but absent from the `User` type and the docs | Add to the documented user payload and `frontend/src/types` |
| `user.completeness` | Profile identity band (meter, "Missing …") | Recomputed from the same predicate as `isProfileComplete()` | `GET /auth/me` → `{ completeness: { percent, missing[] } }` |
| `mentor project memberCount` | Mentor rows | Not in `/mentors/:id/projects` | See §2 |
| Material `sourceCounts` | Project materials coverage meter | Counted from rows | Optional aggregate |

## 5. Missing verbs

| Action | Where | Today | Suggested |
|---|---|---|---|
| Mark a notification **unread** | `/notifications` row tools | Not offered at all — there is no endpoint, and faking it locally would let a reload contradict the UI | `PATCH /notifications/:id/unread` |
| `minimumStock` on inventory items | `/inventory` "Running low" tag and stat | **A presentation policy**: an item is "low" under 25 % of its own `totalQuantity` (`LOW_STOCK_RATIO`). It never changes stock | Real `minimumStock` field returned by `GET /inventory` |
| Leave a club / leave a project | Club and project detail | No endpoint, so membership is shown, never toggled | `DELETE /clubs/:id/join`, `DELETE /projects/:id/join` |
| Bulk approve / reject material requests | `/material-requests` | Deliberately not added: it would be a client loop over the existing per-item endpoint | `POST /material-requests/bulk-approve` |

## 6. Shell and navigation

| What | Where | Today | Suggested |
|---|---|---|---|
| "Jump to" search (`/`) | App header | Filters the signed-in nav destinations client-side; there is no search index | `GET /search?q=&scope=shell`, later extended to clubs/projects/events by name |
| Breadcrumb parent on detail routes | Header (`Clubs / Club details`) | The route carries only an id; the shell will not fetch a record to label a crumb | A lightweight `name` in the detail response, or `GET /clubs/:id/summary` |
| Relative timestamps ("12m ago") | Notification popover and rows | Computed in the browser from `createdAt` | Not needed — presentation |

## 7. Presentation-only derivations (no API needed)

Recorded so nobody mistakes them for missing data: day grouping in the inbox and agenda,
relative day labels ("In 7 days"), monograms from names, sorting core-team-first, the events
"day count" chips, and every "N more" disclosure.

---

## What is deliberately not faked

- No placeholder records, names, counts or percentages anywhere.
- No invented progress/health scores: every meter plots two or more real counts and prints
  its legend.
- No fabricated activity feeds: the project timeline is the updates the API returns.
- No disabled/invented controls for capabilities that do not exist yet.
- Screenshots of empty/error states were produced with Puppeteer request interception only;
  no seed data was written and no mock response ships in the app.
