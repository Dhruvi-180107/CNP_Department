# Projects — what is derived, filtered or mocked on the client

The projects routes use the existing endpoints unchanged: `GET /projects`,
`GET /mentors/:id/projects` (faculty mentors), `GET /projects/:id`, `GET /projects/:id/members`,
`GET /projects/:id/mentors`, `GET /join-requests/student`, `GET /join-requests/project/:id`,
`POST /projects/:id/join`, `PATCH /join-requests/:id/approve|reject`, `POST /projects`,
`PATCH /projects/:id`, `PATCH /projects/:id/status`, `POST /projects/:id/image`,
`POST|DELETE /projects/:id/members`, `PATCH /projects/:id/team-leader`,
`POST|DELETE /projects/:id/mentors`, `PATCH /projects/:id/mentors/:mentorId/primary`,
`GET|POST /projects/:id/updates`, `GET|POST /projects/:id/feedback`,
`GET|POST /projects/:id/materials`, `GET /inventory`, `GET|POST /material-requests/...`.
Every guard, validation and `window.confirm` is unchanged.

| What | Where | Why it is client-side today | Suggested API |
|---|---|---|---|
| Team size and the student's relation (leader / member / request pending) per row | `/projects` portfolio rows | `GET /projects` returns only `teamLeaderId`, not the roster; the page joins one `GET /projects/:id/members` per project plus `GET /join-requests/student` | Include `memberIds` / `memberCount` and `myRelation` on each project, or `GET /projects?mine=1` (`// MOCK:` in `Projects.tsx`) |
| Roster count per project (N+1) | `/projects` rows and "Students on teams" total | Same per-project member calls; unique students are deduplicated client-side | `GET /projects/summary` or counts on the directory payload |
| Status filter (All / Active / Completed / Inactive) and search | `/projects` panel head | `GET /projects` accepts no query; filtering happens over the fetched list. Only statuses present in the data are offered as filters, so a zero-result filter cannot happen | `GET /projects?status=active&q=` |
| "Completed" / "Inactive" group collapse | `/projects` portfolio | The server returns all statuses in insertion order; the client groups them, active first, and remembers the disclosure state | Server-side ordering, or keep groups client-side |
| "Team leaders" rail and "You" panel (leading / on a team / mentoring / administering) | `/projects` aside | Derived from `teamLeaderId`, the member map and the role already known from `AuthContext` | `GET /projects/summary` with a per-role block |
| "3 projects · 4 students on teams · 3 team leaders" footer | `/projects` panel foot | Counted from the fetched projects and member lists | Aggregate endpoint |
| Pending join-request count in the facts aside | `/projects/:id` aside | `ProjectJoinRequests` already fetches the pending requests; the count is lifted to the page with an optional `onCountChange` prop (the panel itself renders only when something is pending) | `pendingJoinRequests` count on `GET /projects/:id` |
| Material coverage meter (central inventory / team bought / already owned) | Project page, Materials panel | The endpoint returns material rows with `source`; the meter is the count of rows per source | Optional `sourceCounts` aggregate |
| Member and mentor ordering | Project page roster | Team leader first, then alphabetical; the endpoints return insertion order | Server-side sort |
| Project monogram (two letters) | Portfolio rows, project hero, dashboard card | No logo field exists beyond the uploaded `image`; the monogram is derived from the project name when `image` is null | Keep as-is (a fallback, not data) |

## Deliberately not mocked

- No placeholder projects, members, mentors, updates, materials or requests. Every number is a
  length, sum or deduplication of a real response.
- No invented progress bars, percentages or "health" scores. The material coverage meter plots
  three real counts and its legend carries the numbers, so colour is never the only signal.
- The timeline is the updates the API returns; no synthetic entries, and no fabricated feedback.
