# Clubs — what is derived, filtered or mocked on the client

The club routes use the existing endpoints unchanged (`GET /clubs`, `GET /clubs/:id/members`,
`GET /clubs/:id/events`, `GET /join-requests/student`, `GET /join-requests/club/:id`,
`POST /clubs/:id/join`, `PATCH /join-requests/:id/approve|reject`, `POST /clubs/:id/members`,
`PATCH|DELETE /clubs/:id/members/:studentId`, `PATCH /clubs/:id`, `PATCH /clubs/:id/coordinator`,
`POST /clubs/:id/logo`, `POST /clubs/:id/cover_image`, `DELETE /events/:id`).

Everything below is computed from data those calls already return. Site-wide, the club membership
lookup is still the documented N+1 (`/clubs/:id/members` per club) — untouched, as instructed.

| What | Where | Why it is client-side today | Suggested API |
|---|---|---|---|
| Directory search (name, description, coordinator, department) | `/clubs` search field | `GET /clubs` takes no query parameters | `GET /clubs?q=` |
| **All / My clubs** filter and the "Your clubs" rail | `/clubs` filter + aside | The server returns every club, so the client compares against the membership map it already built | `GET /clubs?scope=joined` (or include `myMembership` on each club) |
| Featured (lead) club | Top of the `/clubs` board | No "featured"/"pinned" concept exists; the page uses the newest club the student belongs to, else the newest club by `createdAt` | `featured` flag on the club, or `GET /clubs?featured=1` |
| Coordinator → clubs grouping and per-coordinator club count | `/clubs` aside "Faculty coordinators" | Derived from the populated `facultyCoordinatorId` on the directory payload | `GET /clubs/coordinators` |
| Member composition meter (core team vs members) | Lead club on `/clubs`; "Composition" panel on the club page | `/clubs` returns `memberCount` / `coreTeamCount`, but `/clubs/:id` does not, so the detail page counts the members array | Add `memberCount` / `coreTeamCount` to `GET /clubs/:id` |
| Member search | Club page members panel (shown above 6 members) | `GET /clubs/:id/members` has no search parameter | `GET /clubs/:id/members?q=` |
| Member ordering (core team first, then name) | Club page members panel | The endpoint returns insertion order | Server-side sort, or accept the client order |
| People totals in the page sub (`3 clubs · 10 members · 2 coordinators`) and the board footer | `/clubs` head and board footer | Summed from `memberCount` and distinct coordinators in the directory payload | A `GET /clubs/summary` aggregate |
| "Created" figures | Page head strip and About panel | Uses `club.createdAt` as the creation date; there is no separate founded date | `foundedAt` if the department wants a real founding year |
| "Needs review" indicator on the requests panel | Admin view | Derived from the filtered `/join-requests/club/:id` list | Include `pendingCount` on the club payload |

## Deliberately not mocked

- No placeholder clubs, members, events, coordinators or totals are shown. Every number is the
  length or sum of a real response.
- No invented "activity" chart. The composition meter is the only data visualisation, and it plots
  two real counts.
- No disabled controls were added for features that do not exist.
